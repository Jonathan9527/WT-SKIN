package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"

	"warthunder-server/database"
	"warthunder-server/models"
)

const WTLiveVehiclesAPI = "https://live.warthunder.com/api/vehicles/get/"

// WTLiveVehicleResponse War Thunder Live 载具 API 响应
type WTLiveVehicleResponse struct {
	Status string `json:"status"`
	Data   struct {
		List []WTLiveVehicle `json:"list"`
	} `json:"data"`
}

// WTLiveVehicle War Thunder Live 载具数据
type WTLiveVehicle struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Type        string  `json:"type"`
	Country     string  `json:"country"`
	Class       string  `json:"class"`
	Rank        int     `json:"rank"`
	BR          float64 `json:"br"`
	Image       string  `json:"image"`
	Description string  `json:"description"`
}

// SyncVehiclesFromWTLive 从 War Thunder Live 同步载具数据
func SyncVehiclesFromWTLive(vehicleType, country, class string) (int, error) {
	formData := url.Values{}
	
	if vehicleType != "" && vehicleType != "any" {
		formData.Set("type", vehicleType)
	}
	if country != "" && country != "any" {
		formData.Set("country", country)
	}
	if class != "" && class != "any" {
		formData.Set("class", class)
	}

	resp, err := http.PostForm(WTLiveVehiclesAPI, formData)
	if err != nil {
		return 0, fmt.Errorf("请求失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, fmt.Errorf("读取响应失败: %w", err)
	}

	var wtResp WTLiveVehicleResponse
	if err := json.Unmarshal(body, &wtResp); err != nil {
		return 0, fmt.Errorf("解析响应失败: %w", err)
	}

	count := 0
	for _, item := range wtResp.Data.List {
		if item.ID == "" {
			continue
		}

		// 检查是否已存在
		var existing models.Vehicle
		if database.DB.Where("wt_live_id = ?", item.ID).First(&existing).Error == nil {
			// 更新现有记录
			existing.Name = item.Name
			existing.Type = item.Type
			existing.Country = item.Country
			existing.Class = item.Class
			existing.Rank = item.Rank
			existing.BR = item.BR
			existing.ImageURL = item.Image
			existing.Description = item.Description
			database.DB.Save(&existing)
		} else {
			// 创建新记录
			vehicle := models.Vehicle{
				WTLiveID:    item.ID,
				Name:        item.Name,
				Type:        item.Type,
				Country:     item.Country,
				Class:       item.Class,
				Rank:        item.Rank,
				BR:          item.BR,
				ImageURL:    item.Image,
				Description: item.Description,
			}
			if err := database.DB.Create(&vehicle).Error; err == nil {
				count++
			}
		}
	}

	return count, nil
}

// GetVehicles 查询载具列表
func GetVehicles(vehicleType, country, class string) ([]models.Vehicle, error) {
	var vehicles []models.Vehicle

	query := database.DB.Model(&models.Vehicle{})

	if vehicleType != "" && vehicleType != "any" {
		query = query.Where("type = ?", vehicleType)
	}
	if country != "" && country != "any" {
		query = query.Where("country = ?", country)
	}
	if class != "" && class != "any" {
		query = query.Where("class = ?", class)
	}

	query = query.Order("country, rank, name")
	query.Find(&vehicles)

	return vehicles, nil
}

// VehicleData 载具数据结构
type VehicleData struct {
	ID      string   `json:"id"`
	Name    string   `json:"name"`
	Count   int      `json:"count"`
	Type    string   `json:"type"`    // 主要类型（取第一个）
	Country string   `json:"country"` // 主要国家（取第一个）
	Class   string   `json:"class"`   // 主要子类型（取第一个）
	Types   []string `json:"types"`   // 所有类型
	Countries []string `json:"countries"` // 所有国家
	Classes []string `json:"classes"` // 所有子类型
}

// cleanVehicleName 清理载具名称中的特殊标记字符
func cleanVehicleName(name string) string {
	// 移除 War Thunder Live 使用的特殊标记字符
	// ▄ (U+2584) - 俘获/租借载具
	// ▃ (U+2583) - 特殊标记
	// ◍ (U+25CD) - 特殊标记
	// ␙ (U+2419) - 特殊标记
	replacements := []string{"▄", "▃", "◍", "␙"}
	result := name
	for _, char := range replacements {
		result = strings.Replace(result, char, "", -1)
	}
	return result
}

// VehicleHierarchy 完整的载具层级结构
type VehicleHierarchy struct {
	VehicleTypes   map[string]VehicleTypeInfo  `json:"vehicleTypes"`
	Countries      map[string]CountryInfo      `json:"countries"`
	VehicleClasses map[string]VehicleClassInfo `json:"vehicleClasses"`
	Vehicles       map[string]VehicleInfo      `json:"vehicles"`
}

type VehicleTypeInfo struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

type CountryInfo struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

type VehicleClassInfo struct {
	Name        string   `json:"name"`
	Count       int      `json:"count"`
	VehicleType []string `json:"vehicleType"`
}

type VehicleInfo struct {
	Name          string   `json:"name"`
	Count         int      `json:"count"`
	VehicleCountry []string `json:"vehicleCountry"`
	VehicleType    []string `json:"vehicleType"`
	VehicleClass   []string `json:"vehicleClass"`
}

// GetVehiclesByFilter 根据筛选条件获取载具列表（从JSON文件）
func GetVehiclesByFilter(vehicleType, country, class string, cleanNames bool) ([]VehicleData, error) {
	// 读取 JSON 文件
	data, err := os.ReadFile("data/vehicles_complete.json")
	if err != nil {
		return nil, fmt.Errorf("读取载具数据失败: %w", err)
	}

	// 解析 JSON
	var hierarchy VehicleHierarchy
	if err := json.Unmarshal(data, &hierarchy); err != nil {
		return nil, fmt.Errorf("解析载具数据失败: %w", err)
	}

	var vehicles []VehicleData

	// 遍历所有载具，根据条件筛选
	for vehicleID, vehicleInfo := range hierarchy.Vehicles {
		// 检查类型匹配
		if vehicleType != "" && vehicleType != "any" {
			matched := false
			for _, vt := range vehicleInfo.VehicleType {
				if vt == vehicleType {
					matched = true
					break
				}
			}
			if !matched {
				continue
			}
		}

		// 检查国家匹配
		if country != "" && country != "any" {
			matched := false
			for _, c := range vehicleInfo.VehicleCountry {
				if c == country {
					matched = true
					break
				}
			}
			if !matched {
				continue
			}
		}

		// 检查子类型匹配
		if class != "" && class != "any" {
			matched := false
			for _, vc := range vehicleInfo.VehicleClass {
				if vc == class {
					matched = true
					break
				}
			}
			if !matched {
				continue
			}
		}

		// 处理载具名称
		name := vehicleInfo.Name
		if cleanNames {
			name = cleanVehicleName(name)
		}

		// 确定主要类型、国家、子类型（取第一个）
		mainType := ""
		if len(vehicleInfo.VehicleType) > 0 {
			mainType = vehicleInfo.VehicleType[0]
		}

		mainCountry := ""
		if len(vehicleInfo.VehicleCountry) > 0 {
			mainCountry = vehicleInfo.VehicleCountry[0]
		}

		mainClass := ""
		if len(vehicleInfo.VehicleClass) > 0 {
			mainClass = vehicleInfo.VehicleClass[0]
		}

		// 添加到结果列表
		vehicles = append(vehicles, VehicleData{
			ID:        vehicleID,
			Name:      name,
			Count:     vehicleInfo.Count,
			Type:      mainType,
			Country:   mainCountry,
			Class:     mainClass,
			Types:     vehicleInfo.VehicleType,
			Countries: vehicleInfo.VehicleCountry,
			Classes:   vehicleInfo.VehicleClass,
		})
	}

	return vehicles, nil
}

// GetVehicleHierarchy 读取并返回载具层级数据
func GetVehicleHierarchy() (map[string]VehicleInfo, error) {
	data, err := os.ReadFile("data/vehicles_complete.json")
	if err != nil {
		return nil, fmt.Errorf("读取载具数据失败: %w", err)
	}
	var hierarchy VehicleHierarchy
	if err := json.Unmarshal(data, &hierarchy); err != nil {
		return nil, fmt.Errorf("解析载具数据失败: %w", err)
	}
	return hierarchy.Vehicles, nil
}

// SyncVehiclesFromJSON 从 JSON 文件同步载具数据到数据库
func SyncVehiclesFromJSON() (int, error) {
	// 读取 JSON 文件
	data, err := os.ReadFile("data/vehicles_complete.json")
	if err != nil {
		return 0, fmt.Errorf("读取载具数据失败: %w", err)
	}

	// 解析 JSON
	var hierarchy VehicleHierarchy
	if err := json.Unmarshal(data, &hierarchy); err != nil {
		return 0, fmt.Errorf("解析载具数据失败: %w", err)
	}

	// 预先统计本地涂装数
	type LocalCount struct {
		VehicleID string
		Count     int
	}
	var localCounts []LocalCount
	database.DB.Raw(`SELECT vehicle_id, COUNT(DISTINCT skin_id) as count FROM skin_vehicles GROUP BY vehicle_id`).Scan(&localCounts)
	localMap := make(map[string]int)
	for _, lc := range localCounts {
		localMap[lc.VehicleID] = lc.Count
	}

	count := 0
	for vehicleID, vehicleInfo := range hierarchy.Vehicles {
		if vehicleID == "" {
			continue
		}

		vehicleType := ""
		if len(vehicleInfo.VehicleType) > 0 {
			vehicleType = vehicleInfo.VehicleType[0]
		}
		country := ""
		if len(vehicleInfo.VehicleCountry) > 0 {
			country = vehicleInfo.VehicleCountry[0]
		}
		class := ""
		if len(vehicleInfo.VehicleClass) > 0 {
			class = vehicleInfo.VehicleClass[0]
		}

		localSkinCount := localMap[vehicleID]

		var existing models.Vehicle
		if database.DB.Where("wt_live_id = ?", vehicleID).First(&existing).Error == nil {
			existing.Name = vehicleInfo.Name
			existing.Type = vehicleType
			existing.Country = country
			existing.Class = class
			existing.SkinCount = localSkinCount
			existing.RemoteSkinCount = vehicleInfo.Count
			database.DB.Save(&existing)
			count++
		} else {
			vehicle := models.Vehicle{
				WTLiveID:        vehicleID,
				Name:            vehicleInfo.Name,
				Type:            vehicleType,
				Country:         country,
				Class:           class,
				SkinCount:       localSkinCount,
				RemoteSkinCount: vehicleInfo.Count,
			}
			if err := database.DB.Create(&vehicle).Error; err == nil {
				count++
			}
		}
	}

	return count, nil
}




// VehicleCountChange 载具涂装数量变化
type VehicleCountChange struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	OldCount    int    `json:"oldCount"`
	NewCount    int    `json:"newCount"`
	Difference  int    `json:"difference"`
	Type        string `json:"type"`
	Country     string `json:"country"`
	Class       string `json:"class"`
}

// RefreshResult 刷新结果
type RefreshResult struct {
	TotalChecked   int                  `json:"totalChecked"`
	TotalChanged   int                  `json:"totalChanged"`
	TotalIncreased int                  `json:"totalIncreased"`
	TotalDecreased int                  `json:"totalDecreased"`
	Changes        []VehicleCountChange `json:"changes"`
}

// RefreshVehicleCountsFromSkinAPI 从涂装 API 刷新载具涂装数量
func RefreshVehicleCountsFromSkinAPI(vehicleType, country, class string) (*RefreshResult, error) {
	// 读取本地 JSON 文件
	localData, err := os.ReadFile("data/vehicles_complete.json")
	if err != nil {
		return nil, fmt.Errorf("读取本地载具数据失败: %w", err)
	}

	var localHierarchy VehicleHierarchy
	if err := json.Unmarshal(localData, &localHierarchy); err != nil {
		return nil, fmt.Errorf("解析本地载具数据失败: %w", err)
	}

	result := &RefreshResult{
		Changes: []VehicleCountChange{},
	}

	// 构建筛选条件
	formData := url.Values{}
	if vehicleType != "" && vehicleType != "any" {
		formData.Set("vehicle_t", vehicleType)
	}
	if country != "" && country != "any" {
		formData.Set("vehicle_c", country)
	}
	if class != "" && class != "any" {
		formData.Set("vehicle_cl", class)
	}

	// 调用涂装 API
	const WTLiveSkinsAPI = "https://live.warthunder.com/api/camouflages/get/"
	resp, err := http.PostForm(WTLiveSkinsAPI, formData)
	if err != nil {
		return nil, fmt.Errorf("请求远程涂装 API 失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取远程响应失败: %w", err)
	}

	// 检查响应是否为空
	if len(body) == 0 {
		return nil, fmt.Errorf("远程 API 返回空响应")
	}

	// 解析涂装数据
	var skinsResp struct {
		Status string `json:"status"`
		Data   struct {
			List []struct {
				VehicleID string `json:"vehicle_id"`
			} `json:"list"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &skinsResp); err != nil {
		// 打印响应内容以便调试
		bodyStr := string(body)
		if len(bodyStr) > 200 {
			bodyStr = bodyStr[:200] + "..."
		}
		return nil, fmt.Errorf("解析远程响应失败: %w (响应内容: %s)", err, bodyStr)
	}

	// 检查 API 状态
	if skinsResp.Status != "OK" {
		return nil, fmt.Errorf("远程 API 返回错误状态: %s", skinsResp.Status)
	}

	// 统计每个载具的涂装数量
	remoteVehicleCounts := make(map[string]int)
	for _, skin := range skinsResp.Data.List {
		if skin.VehicleID != "" {
			remoteVehicleCounts[skin.VehicleID]++
		}
	}

	// 对比本地和远程数据
	for vehicleID, vehicleInfo := range localHierarchy.Vehicles {
		// 检查是否匹配筛选条件
		if vehicleType != "" && vehicleType != "any" {
			matched := false
			for _, vt := range vehicleInfo.VehicleType {
				if vt == vehicleType {
					matched = true
					break
				}
			}
			if !matched {
				continue
			}
		}

		if country != "" && country != "any" {
			matched := false
			for _, c := range vehicleInfo.VehicleCountry {
				if c == country {
					matched = true
					break
				}
			}
			if !matched {
				continue
			}
		}

		if class != "" && class != "any" {
			matched := false
			for _, vc := range vehicleInfo.VehicleClass {
				if vc == class {
					matched = true
					break
				}
			}
			if !matched {
				continue
			}
		}

		result.TotalChecked++

		// 获取远程数量
		remoteCount := remoteVehicleCounts[vehicleID]
		localCount := vehicleInfo.Count

		// 检查是否有变化
		if remoteCount != localCount {
			difference := remoteCount - localCount
			
			// 确定主要类型、国家、子类型
			mainType := ""
			if len(vehicleInfo.VehicleType) > 0 {
				mainType = vehicleInfo.VehicleType[0]
			}
			mainCountry := ""
			if len(vehicleInfo.VehicleCountry) > 0 {
				mainCountry = vehicleInfo.VehicleCountry[0]
			}
			mainClass := ""
			if len(vehicleInfo.VehicleClass) > 0 {
				mainClass = vehicleInfo.VehicleClass[0]
			}

			change := VehicleCountChange{
				ID:         vehicleID,
				Name:       vehicleInfo.Name,
				OldCount:   localCount,
				NewCount:   remoteCount,
				Difference: difference,
				Type:       mainType,
				Country:    mainCountry,
				Class:      mainClass,
			}

			result.Changes = append(result.Changes, change)
			result.TotalChanged++

			if difference > 0 {
				result.TotalIncreased++
			} else {
				result.TotalDecreased++
			}
		}
	}

	return result, nil
}


// RemoteStats War Thunder Live 远程统计数据
type RemoteStats struct {
	TotalVehicles int    `json:"totalVehicles"`
	TotalSkins    int    `json:"totalSkins"`
	UpdateTime    string `json:"updateTime"`
}

// GetRemoteStats 获取 War Thunder Live 统计数据（从本地 JSON 文件）
func GetRemoteStats() (*RemoteStats, error) {
	// 读取本地 JSON 文件（这个文件是从 War Thunder Live 生成的）
	data, err := os.ReadFile("data/vehicles_complete.json")
	if err != nil {
		return nil, fmt.Errorf("读取载具数据失败: %w", err)
	}

	var hierarchy VehicleHierarchy
	if err := json.Unmarshal(data, &hierarchy); err != nil {
		return nil, fmt.Errorf("解析载具数据失败: %w", err)
	}

	// 统计总涂装数
	totalSkins := 0
	for _, vehicleInfo := range hierarchy.Vehicles {
		totalSkins += vehicleInfo.Count
	}

	// 获取文件修改时间
	fileInfo, err := os.Stat("data/vehicles_complete.json")
	updateTime := "未知"
	if err == nil {
		updateTime = fileInfo.ModTime().Format("2006-01-02 15:04")
	}

	return &RemoteStats{
		TotalVehicles: len(hierarchy.Vehicles),
		TotalSkins:    totalSkins,
		UpdateTime:    updateTime,
	}, nil
}
