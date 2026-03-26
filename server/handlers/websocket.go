package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"warthunder-server/services"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // 允许所有来源，生产环境应该限制
	},
}

// SyncSkinsWebSocket WebSocket 同步涂装
func SyncSkinsWebSocket(c *gin.Context) {
	// 升级为 WebSocket 连接
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket 升级失败: %v", err)
		return
	}
	defer conn.Close()

	// 读取客户端发送的参数
	_, message, err := conn.ReadMessage()
	if err != nil {
		log.Printf("读取消息失败: %v", err)
		return
	}

	// 解析参数
	var params struct {
		VehicleType    string `json:"vehicleType"`
		VehicleCountry string `json:"vehicleCountry"`
		VehicleClass   string `json:"vehicleClass"`
	}
	if err := json.Unmarshal(message, &params); err != nil {
		conn.WriteJSON(services.SyncMessage{
			Type:    "error",
			Message: "参数解析失败: " + err.Error(),
		})
		return
	}

	// 获取载具列表
	vehicles, err := services.GetVehiclesByFilter(params.VehicleType, params.VehicleCountry, params.VehicleClass, false)
	if err != nil {
		conn.WriteJSON(services.SyncMessage{
			Type:    "error",
			Message: "获取载具列表失败: " + err.Error(),
		})
		return
	}

	if len(vehicles) == 0 {
		conn.WriteJSON(services.SyncMessage{
			Type:    "error",
			Message: "没有找到符合条件的载具",
		})
		return
	}

	// 定义回调函数，通过 WebSocket 发送消息
	callback := func(msg services.SyncMessage) {
		if err := conn.WriteJSON(msg); err != nil {
			log.Printf("发送消息失败: %v", err)
		}
	}

	// 开始同步
	if err := services.SyncSkinsFromVehicleList(vehicles, callback); err != nil {
		conn.WriteJSON(services.SyncMessage{
			Type:    "error",
			Message: "同步失败: " + err.Error(),
		})
	}
}
