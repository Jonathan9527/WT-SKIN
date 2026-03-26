package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"warthunder-server/database"
	"warthunder-server/models"
)

// SyncMessage WebSocket 同步消息
type SyncMessage struct {
	Type      string      `json:"type"`      // log, progress, complete, error
	Message   string      `json:"message"`   // 消息内容
	URL       string      `json:"url"`       // 请求的 URL
	Vehicle   string      `json:"vehicle"`   // 当前载具
	Total     int         `json:"total"`     // 总数
	Current   int         `json:"current"`   // 当前进度
	NewCount  int         `json:"newCount"`  // 新增数量
	ExistCount int        `json:"existCount"` // 已存在数量
	Data      interface{} `json:"data"`      // 额外数据
	Timestamp int64       `json:"timestamp"` // 时间戳
}

// SyncCallback WebSocket 回调函数类型
type SyncCallback func(msg SyncMessage)

// SyncSkinsFromVehicleList 根据载具列表同步涂装数据
func SyncSkinsFromVehicleList(vehicles []VehicleData, callback SyncCallback) error {
	total := len(vehicles)
	newCount := 0
	existCount := 0

	// 发送开始消息
	callback(SyncMessage{
		Type:      "progress",
		Message:   fmt.Sprintf("开始同步 %d 个载具的涂装数据", total),
		Total:     total,
		Current:   0,
		Timestamp: time.Now().Unix(),
	})

	for i, vehicle := range vehicles {
		current := i + 1

		// 发送当前载具信息
		callback(SyncMessage{
			Type:      "log",
			Message:   fmt.Sprintf("[%d/%d] 正在同步载具: %s (ID: %s)", current, total, vehicle.Name, vehicle.ID),
			Vehicle:   vehicle.Name,
			Total:     total,
			Current:   current,
			Timestamp: time.Now().Unix(),
		})

		// 构建请求参数
		formData := url.Values{}
		formData.Set("content", "camouflage")
		formData.Set("sort", "created")
		formData.Set("user", "")
		formData.Set("period", "365") // 查询一年内的数据
		formData.Set("searchString", "")
		formData.Set("page", "0")
		formData.Set("featured", "0")
		formData.Set("subtype", "all")
		
		// 设置载具筛选条件
		if vehicle.Type != "" {
			formData.Set("vehicleType", vehicle.Type)
		}
		if vehicle.Country != "" {
			formData.Set("vehicleCountry", vehicle.Country)
		}
		if vehicle.Class != "" {
			formData.Set("vehicleClass", vehicle.Class)
		}
		formData.Set("vehicle", vehicle.ID)

		// 构建完整 URL
		requestURL := WTLiveAPI + "?" + formData.Encode()

		// 发送请求 URL
		callback(SyncMessage{
			Type:      "log",
			Message:   fmt.Sprintf("请求 URL: %s", requestURL),
			URL:       requestURL,
			Vehicle:   vehicle.Name,
			Total:     total,
			Current:   current,
			Timestamp: time.Now().Unix(),
		})

		// 发送请求
		resp, err := http.PostForm(WTLiveAPI, formData)
		if err != nil {
			callback(SyncMessage{
				Type:      "error",
				Message:   fmt.Sprintf("请求失败: %v", err),
				Vehicle:   vehicle.Name,
				Total:     total,
				Current:   current,
				Timestamp: time.Now().Unix(),
			})
			continue
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			callback(SyncMessage{
				Type:      "error",
				Message:   fmt.Sprintf("读取响应失败: %v", err),
				Vehicle:   vehicle.Name,
				Total:     total,
				Current:   current,
				Timestamp: time.Now().Unix(),
			})
			continue
		}

		// 解析响应
		var wtResp WTLiveResponse
		if err := json.Unmarshal(body, &wtResp); err != nil {
			callback(SyncMessage{
				Type:      "error",
				Message:   fmt.Sprintf("解析响应失败: %v", err),
				Vehicle:   vehicle.Name,
				Total:     total,
				Current:   current,
				Timestamp: time.Now().Unix(),
			})
			continue
		}

		// 发送返回数据信息
		callback(SyncMessage{
			Type:      "log",
			Message:   fmt.Sprintf("返回 %d 个涂装", len(wtResp.Data.List)),
			Vehicle:   vehicle.Name,
			Total:     total,
			Current:   current,
			Data:      map[string]interface{}{"count": len(wtResp.Data.List)},
			Timestamp: time.Now().Unix(),
		})

		// 处理每个涂装
		vehicleNewCount := 0
		vehicleExistCount := 0

		for _, item := range wtResp.Data.List {
			langGroup := item.LangGroup
			wtLiveID := item.ID

			if langGroup == 0 {
				langGroup = wtLiveID
			}

			if wtLiveID > 0 {
				// 检查是否已存在
				var existing models.Skin
				if database.DB.Where("wt_live_id = ?", wtLiveID).First(&existing).Error != nil {
					// 创建基本记录
					countries := []string{vehicle.Country}
					countriesJSON, _ := json.Marshal(countries)
					
					basicSkin := models.Skin{
						WTLiveID:       wtLiveID,
						LangGroup:      langGroup,
						Title:          item.PageTitle,
						Description:    item.Description,
						VehicleType:    vehicle.Type,
						VehicleCountries: string(countriesJSON),
						VehicleClass:   vehicle.Class,
						Likes:          item.Likes,
						Views:          item.Views,
						Downloads:      item.Downloads,
						Comments:       item.Comments,
						Featured:       item.Featured,
						CreatedTS:      item.Created,
					}
					database.DB.Create(&basicSkin)
					vehicleNewCount++

					// 异步获取详情
					go func(lg int) {
						FetchSkinDetail(lg)
					}(langGroup)
				} else {
					vehicleExistCount++
				}
			}
		}

		newCount += vehicleNewCount
		existCount += vehicleExistCount

		// 发送本地数据新增情况
		callback(SyncMessage{
			Type:       "log",
			Message:    fmt.Sprintf("本地数据: 新增 %d 个, 已存在 %d 个", vehicleNewCount, vehicleExistCount),
			Vehicle:    vehicle.Name,
			Total:      total,
			Current:    current,
			NewCount:   newCount,
			ExistCount: existCount,
			Data: map[string]interface{}{
				"vehicleNewCount":   vehicleNewCount,
				"vehicleExistCount": vehicleExistCount,
			},
			Timestamp: time.Now().Unix(),
		})

		// 发送进度更新
		callback(SyncMessage{
			Type:       "progress",
			Message:    fmt.Sprintf("进度: %d/%d (%.1f%%)", current, total, float64(current)/float64(total)*100),
			Total:      total,
			Current:    current,
			NewCount:   newCount,
			ExistCount: existCount,
			Timestamp:  time.Now().Unix(),
		})

		// 添加延迟，避免请求过快
		time.Sleep(500 * time.Millisecond)
	}

	// 发送完成消息
	callback(SyncMessage{
		Type:       "complete",
		Message:    fmt.Sprintf("同步完成! 总计: %d 个载具, 新增: %d 个涂装, 已存在: %d 个涂装", total, newCount, existCount),
		Total:      total,
		Current:    total,
		NewCount:   newCount,
		ExistCount: existCount,
		Timestamp:  time.Now().Unix(),
	})

	return nil
}
