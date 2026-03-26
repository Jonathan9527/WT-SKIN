package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

// 后端服务地址
var ServerURL = "http://localhost:8080"

// SetServerURL 设置后端服务地址
func SetServerURL(url string) {
	ServerURL = url
}

// ContentType 内容类型
type ContentType string

const (
	ContentCamouflage ContentType = "camouflage" // 涂装
	ContentSight      ContentType = "sight"      // 准星
	ContentModel      ContentType = "model"      // 模型
	ContentImage      ContentType = "image"      // 图片
	ContentControls   ContentType = "controls"   // 控制
)

// SortType 排序类型
type SortType string

const (
	SortCreated   SortType = "created"   // 创建时间
	SortLikes     SortType = "likes"     // 点赞数
	SortViews     SortType = "views"     // 浏览数
	SortDownloads SortType = "downloads" // 下载数
)

// VehicleType 载具类型
type VehicleType string

const (
	VehicleTypeAny        VehicleType = "any"
	VehicleTypeAircraft   VehicleType = "aircraft"   // 飞机
	VehicleTypeTank       VehicleType = "tank"       // 坦克
	VehicleTypeHelicopter VehicleType = "helicopter" // 直升机
	VehicleTypeShip       VehicleType = "ship"       // 舰船
)

// VehicleClass 载具子类型
type VehicleClass string

const (
	VehicleClassAny VehicleClass = "any"
	// 坦克子类型
	VehicleClassLightTank     VehicleClass = "light_tank"
	VehicleClassMediumTank    VehicleClass = "medium_tank"
	VehicleClassHeavyTank     VehicleClass = "heavy_tank"
	VehicleClassTankDestroyer VehicleClass = "tank_destroyer"
	VehicleClassSPAA          VehicleClass = "spaa"
	// 飞机子类型
	VehicleClassFighter  VehicleClass = "fighter"
	VehicleClassAttacker VehicleClass = "attacker"
	VehicleClassBomber   VehicleClass = "bomber"
	// 舰船子类型
	VehicleClassFleet   VehicleClass = "fleet"
	VehicleClassCoastal VehicleClass = "coastal"
)

// VehicleCountry 国家
type VehicleCountry string

const (
	CountryAny     VehicleCountry = "any"
	CountryUSA     VehicleCountry = "usa"
	CountryGermany VehicleCountry = "germany"
	CountryUSSR    VehicleCountry = "ussr"
	CountryBritain VehicleCountry = "britain"
	CountryJapan   VehicleCountry = "japan"
	CountryChina   VehicleCountry = "china"
	CountryItaly   VehicleCountry = "italy"
	CountryFrance  VehicleCountry = "france"
	CountrySweden  VehicleCountry = "sweden"
	CountryIsrael  VehicleCountry = "israel"
)

// SearchParams API 搜索参数
type SearchParams struct {
	Content        ContentType    `json:"content"`
	Sort           SortType       `json:"sort"`
	User           string         `json:"user"`
	Period         int            `json:"period"`
	SearchString   string         `json:"searchString"`
	Page           int            `json:"page"`
	Featured       int            `json:"featured"`
	Subtype        string         `json:"subtype"`
	VehicleType    string         `json:"vehicleType"`
	VehicleCountry VehicleCountry `json:"vehicleCountry"`
	VehicleClass   string         `json:"vehicleClass"`
	Vehicle        string         `json:"vehicle"`
}

// APIResponse API 响应
type APIResponse struct {
	Status string `json:"status"`
	Data   struct {
		List  []Content `json:"list"`
		Total int64     `json:"total"`
		Page  int       `json:"page"`
	} `json:"data"`
}

// Content 内容项（从后端数据库返回）
type Content struct {
	ID             int      `json:"id"`
	WTLiveID       int      `json:"wt_live_id"`
	Title          string   `json:"title"`
	Description    string   `json:"description"`
	Author         Author   `json:"author"`
	VehicleType    string   `json:"vehicle_type"`
	VehicleCountry string   `json:"vehicle_country"`
	VehicleClass   string   `json:"vehicle_class"`
	VehicleName    string   `json:"vehicle_name"`
	ImageURL       string   `json:"image_url"`
	Images         []Image  `json:"images"`
	ImagesRaw      string   `json:"images_raw"` // JSON 字符串
	File           *File    `json:"file,omitempty"`
	FileURL        string   `json:"file_url"`
	FileName       string   `json:"file_name"`
	FileSize       int64    `json:"file_size"`
	FileType       string   `json:"file_type"`
	Likes          int      `json:"likes"`
	Views          int      `json:"views"`
	Downloads      int      `json:"downloads"`
	Comments       int      `json:"comments"`
	Vehicle        *VehicleInfo `json:"vehicle,omitempty"`
}

// VehicleInfo 载具信息
type VehicleInfo struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Country string `json:"country"`
	Type    string `json:"type"`
	Class   string `json:"class"`
}

// Author 作者信息
type Author struct {
	ID       int    `json:"id"`
	Nickname string `json:"nickname"`
	Avatar   string `json:"avatar"`
}

// Image 图片信息
type Image struct {
	ID     int     `json:"id"`
	Type   string  `json:"type"`
	Src    string  `json:"src"`
	Width  int     `json:"width"`
	Height int     `json:"height"`
	Ratio  float64 `json:"ratio"`
}

// File 文件信息
type File struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	Link string `json:"link"`
	Type string `json:"type"`
	Size int64  `json:"size"`
}

// Client API 客户端
type Client struct {
	httpClient *http.Client
}

// NewClient 创建新的 API 客户端
func NewClient() *Client {
	return &Client{
		httpClient: &http.Client{},
	}
}

// Search 从后端服务搜索涂装
func (c *Client) Search(params SearchParams) (*APIResponse, error) {
	// 构建 URL 参数
	urlParams := url.Values{}
	urlParams.Set("vehicleType", params.VehicleType)
	urlParams.Set("vehicleCountry", string(params.VehicleCountry))
	urlParams.Set("vehicleClass", params.VehicleClass)
	urlParams.Set("vehicle", params.Vehicle)
	urlParams.Set("sort", string(params.Sort))
	urlParams.Set("period", fmt.Sprintf("%d", params.Period))
	urlParams.Set("page", fmt.Sprintf("%d", params.Page))
	urlParams.Set("pageSize", "20")
	if params.SearchString != "" {
		urlParams.Set("search", params.SearchString)
	}

	// 请求后端服务（使用 /client 路径）
	apiURL := fmt.Sprintf("%s/client/skins?%s", ServerURL, urlParams.Encode())
	fmt.Printf("API Request: %s\n", apiURL)

	resp, err := c.httpClient.Get(apiURL)
	if err != nil {
		return nil, fmt.Errorf("请求后端失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	// 解析后端响应
	var serverResp struct {
		Status string `json:"status"`
		Data   struct {
			List  []ServerSkin `json:"list"`
			Total int64        `json:"total"`
			Page  int          `json:"page"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &serverResp); err != nil {
		return nil, fmt.Errorf("解析响应失败: %w", err)
	}

	// 转换为客户端格式
	apiResp := &APIResponse{
		Status: serverResp.Status,
	}
	apiResp.Data.Total = serverResp.Data.Total
	apiResp.Data.Page = serverResp.Data.Page

	for _, skin := range serverResp.Data.List {
		content := Content{
			ID:             skin.ID,
			WTLiveID:       skin.WTLiveID,
			Title:          skin.Title,
			Description:    skin.Description,
			VehicleType:    skin.VehicleType,
			VehicleCountry: skin.VehicleCountry,
			VehicleClass:   skin.VehicleClass,
			ImageURL:       skin.ImageURL,
			FileURL:        skin.FileURL,
			FileName:       skin.FileName,
			FileSize:       skin.FileSize,
			FileType:       skin.FileType,
			Likes:          skin.Likes,
			Views:          skin.Views,
			Downloads:      skin.Downloads,
			Author: Author{
				Nickname: skin.Author,
			},
		}

		// 解析图片 JSON
		if skin.Images != "" {
			var imgURLs []string
			if err := json.Unmarshal([]byte(skin.Images), &imgURLs); err == nil {
				for _, imgURL := range imgURLs {
					content.Images = append(content.Images, Image{Src: imgURL})
				}
			}
		}

		// 如果没有解析到图片，使用主图
		if len(content.Images) == 0 && skin.ImageURL != "" {
			content.Images = []Image{{Src: skin.ImageURL}}
		}

		// 构建文件信息
		if skin.FileURL != "" {
			content.File = &File{
				Name: skin.FileName,
				Link: skin.FileURL,
				Size: skin.FileSize,
				Type: skin.FileType,
			}
		}

		apiResp.Data.List = append(apiResp.Data.List, content)
	}

	return apiResp, nil
}

// ServerSkin 后端返回的皮肤数据结构
type ServerSkin struct {
	ID             int    `json:"id"`
	WTLiveID       int    `json:"wt_live_id"`
	Title          string `json:"title"`
	Description    string `json:"description"`
	Author         string `json:"author"`
	VehicleType    string `json:"vehicle_type"`
	VehicleCountry string `json:"vehicle_country"`
	VehicleClass   string `json:"vehicle_class"`
	VehicleName    string `json:"vehicle_name"`
	ImageURL       string `json:"image_url"`
	Images         string `json:"images"`
	FileURL        string `json:"file_url"`
	FileName       string `json:"file_name"`
	FileSize       int64  `json:"file_size"`
	FileType       string `json:"file_type"`
	Likes          int    `json:"likes"`
	Views          int    `json:"views"`
	Downloads      int    `json:"downloads"`
}

// DownloadFile 下载文件
func (c *Client) DownloadFile(fileURL, savePath string) error {
	resp, err := c.httpClient.Get(fileURL)
	if err != nil {
		return fmt.Errorf("下载失败: %w", err)
	}
	defer resp.Body.Close()
	return nil
}

// Vehicle 载具信息
type Vehicle struct {
	ID        uint   `json:"id"`
	WTLiveID  string `json:"wt_live_id"`
	Name      string `json:"name"`
	Type      string `json:"type"`
	Country   string `json:"country"`
	Class     string `json:"class"`
	SkinCount int    `json:"skin_count"`
}

// VehiclesResponse 载具列表响应
type VehiclesResponse struct {
	Status string    `json:"status"`
	Data   []Vehicle `json:"data"`
}

// GetVehicles 获取载具列表（四级筛选）
func (c *Client) GetVehicles(vehicleType, country, class string) (*VehiclesResponse, error) {
	urlParams := url.Values{}
	if vehicleType != "" && vehicleType != "any" {
		urlParams.Set("type", vehicleType)
	}
	if country != "" && country != "any" {
		urlParams.Set("country", country)
	}
	if class != "" && class != "any" {
		urlParams.Set("class", class)
	}

	// 请求后端服务（使用 /client 路径）
	apiURL := fmt.Sprintf("%s/client/vehicles?%s", ServerURL, urlParams.Encode())
	fmt.Printf("API Request: %s\n", apiURL)

	resp, err := c.httpClient.Get(apiURL)
	if err != nil {
		return nil, fmt.Errorf("请求后端失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	var vehiclesResp VehiclesResponse
	if err := json.Unmarshal(body, &vehiclesResp); err != nil {
		return nil, fmt.Errorf("解析响应失败: %w", err)
	}

	return &vehiclesResp, nil
}
