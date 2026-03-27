package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"time"

	"warthunder-server/database"
	"warthunder-server/models"

	"github.com/google/uuid"
)

// StartSyncTask 启动同步任务（后台运行）
func StartSyncTask(vehicleType, vehicleCountry, vehicleClass string) (string, error) {
	// 生成会话ID
	sessionID := uuid.New().String()

	// 创建同步会话
	session := models.SyncSession{
		SessionID:      sessionID,
		VehicleType:    vehicleType,
		VehicleCountry: vehicleCountry,
		VehicleClass:   vehicleClass,
		Status:         "running",
		StartedAt:      time.Now(),
	}
	if err := database.DB.Create(&session).Error; err != nil {
		return "", fmt.Errorf("创建同步会话失败: %v", err)
	}

	// 写入开始日志
	writeLog(sessionID, "info", fmt.Sprintf("开始同步 - 类型: %s, 国家: %s, 子类型: %s", vehicleType, vehicleCountry, vehicleClass), "")

	// 启动后台任务
	go runSyncTask(sessionID, vehicleType, vehicleCountry, vehicleClass)

	return sessionID, nil
}

// runSyncTask 执行同步任务
func runSyncTask(sessionID, vehicleType, vehicleCountry, vehicleClass string) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("同步任务异常: %v", r)
			writeLog(sessionID, "error", fmt.Sprintf("同步任务异常: %v", r), "")
			updateSessionStatus(sessionID, "error")
		}
	}()

	var vehicles []VehicleData
	var err error

	// 如果是全部同步，从数据库获取所有载具
	if vehicleType == "all" {
		writeLog(sessionID, "info", "正在从数据库获取所有载具列表（全部同步模式）...", "")
		
		var dbVehicles []models.Vehicle
		if err := database.DB.Find(&dbVehicles).Error; err != nil {
			writeLog(sessionID, "error", fmt.Sprintf("获取载具列表失败: %v", err), "")
			updateSessionStatus(sessionID, "error")
			return
		}
		
		// 转换为 VehicleData
		for _, v := range dbVehicles {
			vehicles = append(vehicles, VehicleData{
				ID:      v.WTLiveID,
				Name:    v.Name,
				Type:    v.Type,
				Country: v.Country,
				Class:   v.Class,
				Count:   v.SkinCount,
			})
		}
		
		writeLog(sessionID, "info", fmt.Sprintf("已加载 %d 个载具", len(vehicles)), "")
	} else {
		// 获取指定类型的载具列表
		writeLog(sessionID, "info", "正在获取载具列表...", "")
		vehicles, err = GetVehiclesByFilter(vehicleType, vehicleCountry, vehicleClass, false)
		if err != nil {
			writeLog(sessionID, "error", fmt.Sprintf("获取载具列表失败: %v", err), "")
			updateSessionStatus(sessionID, "error")
			return
		}
	}

	if len(vehicles) == 0 {
		writeLog(sessionID, "error", "没有找到符合条件的载具", "")
		updateSessionStatus(sessionID, "error")
		return
	}

	writeLog(sessionID, "info", fmt.Sprintf("找到 %d 个载具，开始同步涂装数据", len(vehicles)), "")

	// 更新会话总数
	database.DB.Model(&models.SyncSession{}).Where("session_id = ?", sessionID).Update("total", len(vehicles))

	newCount := 0
	existCount := 0

	// 遍历载具同步涂装
	for i, vehicle := range vehicles {
		current := i + 1

		// 更新进度
		database.DB.Model(&models.SyncSession{}).
			Where("session_id = ?", sessionID).
			Updates(map[string]interface{}{
				"current": current,
			})

		// 构建API参数
		formData := url.Values{}
		formData.Set("content", "camouflage")
		formData.Set("sort", "created")
		formData.Set("period", "all")
		formData.Set("searchString", "")
		formData.Set("page", "0")
		formData.Set("featured", "0")
		formData.Set("subtype", "all")
		// 不设置 limit，使用 API 默认值 25
		formData.Set("vehicleCountry", vehicle.Country)
		formData.Set("vehicleType", vehicle.Type)
		formData.Set("vehicleClass", vehicle.Class)
		formData.Set("vehicle", vehicle.ID)

		apiURL := "https://live.warthunder.com/api/feed/get_regular/"

		writeLog(sessionID, "progress", fmt.Sprintf("[%d/%d] 正在同步载具: %s (涂装数: %d)", current, len(vehicles), vehicle.Name, vehicle.Count), "")

		// 第一次请求，获取第一页
		langGroups, _, _, err := FetchSkinsFromAPIWithForm(apiURL, formData)
		if err != nil {
			writeLog(sessionID, "error", fmt.Sprintf("同步失败: %v", err), "")
			continue
		}

		// 收集所有 lang_group
		allLangGroups := make([]int, 0)
		allLangGroups = append(allLangGroups, langGroups...)

		// API 默认每页 25 条
		const defaultLimit = 25
		
		// 使用 vehicle.Count 计算总页数
		if vehicle.Count > defaultLimit {
			totalPages := (vehicle.Count + defaultLimit - 1) / defaultLimit
			
			// 从第 2 页开始获取（第 1 页已经获取了）
			for page := 1; page < totalPages; page++ {
				formData.Set("page", fmt.Sprintf("%d", page))

				pageLangGroups, _, _, err := FetchSkinsFromAPIWithForm(apiURL, formData)
				if err != nil {
					continue
				}

				allLangGroups = append(allLangGroups, pageLangGroups...)
				
				// 避免请求过快
				time.Sleep(300 * time.Millisecond)
			}
		}

		// 统计新增和已存在
		newInBatch := 0
		existInBatch := 0

		for _, langGroup := range allLangGroups {
			var existingSkin models.Skin
			err := database.DB.Where("lang_group = ?", langGroup).First(&existingSkin).Error
			if err != nil {
				// 不存在，获取详情并创建
				skin, err := FetchSkinDetail(langGroup)
				if err != nil {
					continue
				}
				newInBatch++
				newCount++

				// 使用当前遍历的载具信息直接回填（不依赖数据库查询）
				updates := map[string]interface{}{}
				if vehicle.Type != "" && skin.VehicleType == "" {
					updates["vehicle_type"] = vehicle.Type
				}
				if vehicle.Class != "" && skin.VehicleClass == "" {
					updates["vehicle_class"] = vehicle.Class
				}
				if vehicle.Name != "" && skin.VehicleName == "" {
					updates["vehicle_name"] = vehicle.Name
				}

				// 初始化国家列表
				country := vehicle.Country
				if country == "" {
					// 兜底：从数据库查载具信息
					var vehicleInfo models.Vehicle
					if database.DB.Where("wt_live_id = ?", vehicle.ID).First(&vehicleInfo).Error == nil {
						country = vehicleInfo.Country
					}
				}
				if country != "" {
					var countries []string
					if skin.VehicleCountries != "" && skin.VehicleCountries != "null" && skin.VehicleCountries != "[]" {
						json.Unmarshal([]byte(skin.VehicleCountries), &countries)
					}
					hasCountry := false
					for _, c := range countries {
						if c == country {
							hasCountry = true
							break
						}
					}
					if !hasCountry {
						countries = append(countries, country)
					}
					countriesJSON, _ := json.Marshal(countries)
					updates["vehicle_countries"] = string(countriesJSON)
				}

				if len(updates) > 0 {
					database.DB.Model(skin).Updates(updates)
				}
				
				// 创建涂装-载具关联
				skinVehicle := models.SkinVehicle{
					SkinID:    skin.ID,
					VehicleID: vehicle.ID,
				}
				database.DB.Create(&skinVehicle)
			} else {
				existInBatch++
				existCount++
				
				// 检查关联是否已存在
				var existingRelation models.SkinVehicle
				err := database.DB.Where("skin_id = ? AND vehicle_id = ?", existingSkin.ID, vehicle.ID).First(&existingRelation).Error
				if err != nil {
					// 关联不存在，创建关联
					skinVehicle := models.SkinVehicle{
						SkinID:    existingSkin.ID,
						VehicleID: vehicle.ID,
					}
					database.DB.Create(&skinVehicle)
					
					// 使用当前载具的国家信息更新
					country := vehicle.Country
					if country == "" {
						var vehicleInfo models.Vehicle
						if database.DB.Where("wt_live_id = ?", vehicle.ID).First(&vehicleInfo).Error == nil {
							country = vehicleInfo.Country
						}
					}
					if country != "" {
						updateSkinCountries(existingSkin.ID, country)
					}
				}

				// 回填缺失的载具类型和子类型
				updates := map[string]interface{}{}
				if vehicle.Type != "" && existingSkin.VehicleType == "" {
					updates["vehicle_type"] = vehicle.Type
				}
				if vehicle.Class != "" && existingSkin.VehicleClass == "" {
					updates["vehicle_class"] = vehicle.Class
				}
				if vehicle.Name != "" && existingSkin.VehicleName == "" {
					updates["vehicle_name"] = vehicle.Name
				}
				if len(updates) > 0 {
					database.DB.Model(&existingSkin).Updates(updates)
				}
			}
		}

		// 更新统计
		database.DB.Model(&models.SyncSession{}).
			Where("session_id = ?", sessionID).
			Updates(map[string]interface{}{
				"new_count":   newCount,
				"exist_count": existCount,
			})

		// 避免请求过快
		time.Sleep(500 * time.Millisecond)
	}

	// 完成同步
	writeLog(sessionID, "complete", fmt.Sprintf("同步完成！总计: %d 个载具, 新增: %d, 已存在: %d", len(vehicles), newCount, existCount), "")
	
	now := time.Now()
	database.DB.Model(&models.SyncSession{}).
		Where("session_id = ?", sessionID).
		Updates(map[string]interface{}{
			"status":       "completed",
			"completed_at": &now,
		})
}

// updateSkinCountries 更新涂装的国家列表
func updateSkinCountries(skinID uint, newCountry string) error {
	var skin models.Skin
	if err := database.DB.First(&skin, skinID).Error; err != nil {
		return err
	}

	// 解析现有国家列表
	var countries []string
	if skin.VehicleCountries != "" && skin.VehicleCountries != "null" {
		json.Unmarshal([]byte(skin.VehicleCountries), &countries)
	}

	// 检查国家是否已存在
	exists := false
	for _, c := range countries {
		if c == newCountry {
			exists = true
			break
		}
	}

	// 如果不存在，添加到列表
	if !exists {
		countries = append(countries, newCountry)
		countriesJSON, _ := json.Marshal(countries)
		database.DB.Model(&skin).Update("vehicle_countries", string(countriesJSON))
	}

	return nil
}

// writeLog 写入日志到数据库
func writeLog(sessionID, logType, message, url string) {
	log := models.SyncLog{
		SessionID: sessionID,
		Type:      logType,
		Message:   message,
		URL:       url,
	}
	if err := database.DB.Create(&log).Error; err != nil {
		fmt.Printf("写入日志失败: %v\n", err)
	}
}

// updateSessionStatus 更新会话状态
func updateSessionStatus(sessionID, status string) {
	updates := map[string]interface{}{
		"status": status,
	}
	if status == "completed" || status == "error" {
		now := time.Now()
		updates["completed_at"] = &now
	}
	database.DB.Model(&models.SyncSession{}).Where("session_id = ?", sessionID).Updates(updates)
}

// GetSyncSession 获取同步会话信息
func GetSyncSession(sessionID string) (*models.SyncSession, error) {
	var session models.SyncSession
	err := database.DB.Where("session_id = ?", sessionID).First(&session).Error
	return &session, err
}

// GetSyncLogs 获取同步日志
func GetSyncLogs(sessionID string, limit int) ([]models.SyncLog, error) {
	var logs []models.SyncLog
	query := database.DB.Where("session_id = ?", sessionID).Order("id ASC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Find(&logs).Error
	return logs, err
}

// GetLatestSyncSessions 获取最近的同步会话列表
func GetLatestSyncSessions(limit int) ([]models.SyncSession, error) {
	var sessions []models.SyncSession
	err := database.DB.Order("created_at DESC").Limit(limit).Find(&sessions).Error
	return sessions, err
}

// FetchSkinsFromAPIWithForm 使用 POST form data 从API获取涂装数据
func FetchSkinsFromAPIWithForm(apiURL string, formData url.Values) ([]int, int, string, error) {
	resp, err := http.PostForm(apiURL, formData)
	if err != nil {
		return nil, 0, "", fmt.Errorf("请求失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, 0, "", fmt.Errorf("读取响应失败: %w", err)
	}

	var wtResp WTLiveResponse
	if err := json.Unmarshal(body, &wtResp); err != nil {
		return nil, 0, "", fmt.Errorf("解析响应失败: %w", err)
	}

	// 返回 lang_group 列表、总数和原始响应
	langGroups := make([]int, 0)
	for _, content := range wtResp.Data.List {
		langGroups = append(langGroups, content.LangGroup)
	}

	// 美化 JSON
	var prettyJSON bytes.Buffer
	if err := json.Indent(&prettyJSON, body, "", "  "); err == nil {
		return langGroups, wtResp.Data.Count, prettyJSON.String(), nil
	}

	return langGroups, wtResp.Data.Count, string(body), nil
}

// FetchSkinsFromAPI 从API获取涂装数据（保留旧版本兼容性）
func FetchSkinsFromAPI(apiURL string) ([]int, error) {
	// 解析 URL 参数
	parsedURL, err := url.Parse(apiURL)
	if err != nil {
		return nil, fmt.Errorf("解析URL失败: %w", err)
	}

	// 将查询参数转换为 form data
	formData := parsedURL.Query()

	resp, err := http.PostForm(apiURL, formData)
	if err != nil {
		return nil, fmt.Errorf("请求失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	var wtResp WTLiveResponse
	if err := json.Unmarshal(body, &wtResp); err != nil {
		return nil, fmt.Errorf("解析响应失败: %w", err)
	}

	// 返回 lang_group 列表
	langGroups := make([]int, 0)
	for _, content := range wtResp.Data.List {
		langGroups = append(langGroups, content.LangGroup)
	}

	return langGroups, nil
}

// SyncResponse 同步响应
type SyncResponse struct {
	SessionID string `json:"session_id"`
	Message   string `json:"message"`
}

// LogsResponse 日志响应
type LogsResponse struct {
	Session *models.SyncSession `json:"session"`
	Logs    []models.SyncLog    `json:"logs"`
}

// SessionsResponse 会话列表响应
type SessionsResponse struct {
	Sessions []models.SyncSession `json:"sessions"`
}
