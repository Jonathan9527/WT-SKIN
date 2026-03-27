package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"

	"warthunder-server/database"
	"warthunder-server/models"
)

const WTLiveAPI = "https://live.warthunder.com/api/feed/get_regular/"
const WTLiveDetailAPI = "https://live.warthunder.com/api/posts/get/"

type WTLiveResponse struct {
	Status string `json:"status"`
	Data   struct {
		List  []WTLiveContent `json:"list"`
		Count int             `json:"count"` // 总数
	} `json:"data"`
}

type WTLiveContent struct {
	ID        int `json:"id"`
	LangGroup int `json:"lang_group"`
	// 列表接口返回的其他元数据字段
	Type        string `json:"type"`
	Created     int64  `json:"created"`
	Visible     bool   `json:"visible"`
	Featured    bool   `json:"featured"`
	Description string `json:"description"`
	PageTitle   string `json:"pageTitle"`
	Likes       int    `json:"likes"`
	Views       int    `json:"views"`
	Downloads   int    `json:"downloads"`
	Comments    int    `json:"comments"`
}

// WTLiveDetailResponse 详情接口返回结构
type WTLiveDetailResponse struct {
	ID          int    `json:"id"`
	LangGroup   int    `json:"lang_group"`
	Language    string `json:"language"`
	Type        string `json:"type"`
	Created     int64  `json:"created"`
	Visible     bool   `json:"visible"`
	Featured    bool   `json:"featured"`
	Description string `json:"description"`
	PageTitle   string `json:"pageTitle"`
	Author      struct {
		ID       int    `json:"id"`
		Nickname string `json:"nickname"`
		Avatar   string `json:"avatar"`
	} `json:"author"`
	Images []struct {
		ID   int    `json:"id"`
		Type string `json:"type"`
		MQ   *struct {
			Src    string  `json:"src"`
			Width  int     `json:"width"`
			Height int     `json:"height"`
			Ratio  float64 `json:"ratio"`
		} `json:"mq"`
		Orig *struct {
			Src string `json:"src"`
		} `json:"orig"`
	} `json:"images"`
	File *struct {
		ID   int    `json:"id"`
		Name string `json:"name"`
		Link string `json:"link"`
		Type string `json:"type"`
		Size int64  `json:"size"`
	} `json:"file"`
	Likes          int  `json:"likes"`
	Views          int  `json:"views"`
	Downloads      int  `json:"downloads"`
	Comments       int  `json:"comments"`
	PbrReady       bool `json:"pbr_ready"`
	MarketSuitable bool `json:"isMarketSuitable"`
}

// FetchSkinDetail 获取涂装详情并保存到数据库
func FetchSkinDetail(langGroup int) (*models.Skin, error) {
	formData := url.Values{}
	formData.Set("lang_group", fmt.Sprintf("%d", langGroup))
	formData.Set("language", "en")

	resp, err := http.PostForm(WTLiveDetailAPI, formData)
	if err != nil {
		return nil, fmt.Errorf("请求详情失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	var detail WTLiveDetailResponse
	if err := json.Unmarshal(body, &detail); err != nil {
		return nil, fmt.Errorf("解析响应失败: %w", err)
	}

	if detail.ID == 0 {
		return nil, fmt.Errorf("无效的响应")
	}

	// 提取标签
	tags := extractTags(detail.Description)

	// 检查是否已存在
	var existing models.Skin
	if database.DB.Where("wt_live_id = ?", detail.ID).First(&existing).Error == nil {
		// 更新现有记录
		updateSkinFromDetail(&existing, &detail)
		database.DB.Save(&existing)
		// 保存标签关联
		saveTags(existing.ID, tags)
		// 更新图片
		saveImages(existing.ID, &detail)
		return &existing, nil
	}

	// 创建新记录
	skin := createSkinFromDetail(&detail)
	if err := database.DB.Create(&skin).Error; err != nil {
		return nil, fmt.Errorf("保存失败: %w", err)
	}

	// 保存标签关联
	saveTags(skin.ID, tags)

	// 保存图片到 SkinImage 表
	saveImages(skin.ID, &detail)

	return &skin, nil
}

// createSkinFromDetail 从详情创建 Skin 记录
func createSkinFromDetail(detail *WTLiveDetailResponse) models.Skin {
	// 收集所有图片URL
	var imagesJSON []string
	for _, img := range detail.Images {
		if img.MQ != nil {
			imagesJSON = append(imagesJSON, img.MQ.Src)
		} else if img.Orig != nil {
			imagesJSON = append(imagesJSON, img.Orig.Src)
		}
	}
	imagesStr, _ := json.Marshal(imagesJSON)

	// 提取载具信息（从描述中解析作为兜底）
	vehicleType, country, vehicleClass := extractVehicleFromDescription(detail.Description)

	// 如果从描述中解析到了国家，初始化国家列表
	vehicleCountries := "[]"
	if country != "" {
		countriesJSON, _ := json.Marshal([]string{country})
		vehicleCountries = string(countriesJSON)
	}

	// 提取标签
	tags := extractTags(detail.Description)
	tagsStr, _ := json.Marshal(tags)

	skin := models.Skin{
		WTLiveID:       detail.ID,
		LangGroup:      detail.LangGroup,
		Title:          extractTitle(detail.PageTitle, detail.Description),
		Description:    detail.Description,
		Author:         detail.Author.Nickname,
		AuthorID:       detail.Author.ID,
		AuthorAvatar:   detail.Author.Avatar,
		VehicleType:    vehicleType,
		VehicleCountries: vehicleCountries,
		VehicleClass:   vehicleClass,
		Tags:           string(tagsStr),
		Likes:          detail.Likes,
		Views:          detail.Views,
		Downloads:      detail.Downloads,
		Comments:       detail.Comments,
		Images:         string(imagesStr),
		Featured:       detail.Featured,
		PbrReady:       detail.PbrReady,
		CreatedTS:      detail.Created,
	}

	if len(detail.Images) > 0 {
		if detail.Images[0].MQ != nil {
			skin.ImageURL = detail.Images[0].MQ.Src
		} else if detail.Images[0].Orig != nil {
			skin.ImageURL = detail.Images[0].Orig.Src
		}
	}

	if detail.File != nil {
		skin.FileURL = detail.File.Link
		skin.FileName = detail.File.Name
		skin.FileSize = detail.File.Size
		skin.FileType = detail.File.Type
	}

	return skin
}

// updateSkinFromDetail 更新现有记录
func updateSkinFromDetail(skin *models.Skin, detail *WTLiveDetailResponse) {
	skin.Likes = detail.Likes
	skin.Views = detail.Views
	skin.Downloads = detail.Downloads
	skin.Comments = detail.Comments
	skin.Featured = detail.Featured
	skin.PbrReady = detail.PbrReady

	// 更新图片
	var imagesJSON []string
	for _, img := range detail.Images {
		if img.MQ != nil {
			imagesJSON = append(imagesJSON, img.MQ.Src)
		} else if img.Orig != nil {
			imagesJSON = append(imagesJSON, img.Orig.Src)
		}
	}
	imagesStr, _ := json.Marshal(imagesJSON)
	skin.Images = string(imagesStr)

	if len(detail.Images) > 0 && detail.Images[0].MQ != nil {
		skin.ImageURL = detail.Images[0].MQ.Src
	}

	// 更新标签
	tags := extractTags(detail.Description)
	tagsStr, _ := json.Marshal(tags)
	skin.Tags = string(tagsStr)

	if detail.File != nil {
		skin.FileURL = detail.File.Link
		skin.FileName = detail.File.Name
		skin.FileSize = detail.File.Size
		skin.FileType = detail.File.Type
	}
}

// extractTags 从 description 中提取 hashtag
func extractTags(description string) []string {
	// 匹配 #hashtag 格式，支持两种情况：
	// 1. HTML 链接中的 hashtag: <a href="...#tag">...</a> 中的 #tag
	// 2. 纯文本中的 #tag
	
	var tags []string
	seen := make(map[string]bool)

	// 方法1: 从 HTML 链接中提取 (格式: <a href="...?q=%23tagname"...>#tagname</a>)
	reLink := regexp.MustCompile(`<a[^>]*class="WTL-Embed-Hashtag"[^>]*>#([a-zA-Z0-9_]+)</a>`)
	matches := reLink.FindAllStringSubmatch(description, -1)
	for _, match := range matches {
		if len(match) > 1 {
			tag := strings.ToLower(match[1])
			if !seen[tag] {
				seen[tag] = true
				tags = append(tags, tag)
			}
		}
	}

	// 方法2: 从纯文本中提取 #tag (如果上面没找到)
	if len(tags) == 0 {
		reTag := regexp.MustCompile(`#([a-zA-Z0-9_]+)`)
		matches = reTag.FindAllStringSubmatch(description, -1)
		for _, match := range matches {
			if len(match) > 1 {
				tag := strings.ToLower(match[1])
				if !seen[tag] {
					seen[tag] = true
					tags = append(tags, tag)
				}
			}
		}
	}

	return tags
}

// saveTags 保存标签到数据库并建立关联
func saveTags(skinID uint, tags []string) {
	for _, tagName := range tags {
		if tagName == "" {
			continue
		}

		// 查找或创建标签
		var tag models.Tag
		result := database.DB.Where("name = ?", tagName).First(&tag)
		if result.Error != nil {
			// 创建新标签
			tag = models.Tag{Name: tagName, Count: 1}
			database.DB.Create(&tag)
		} else {
			// 更新计数
			database.DB.Model(&tag).Update("count", tag.Count+1)
		}

		// 检查关联是否已存在
		var existingLink models.SkinTag
		if database.DB.Where("skin_id = ? AND tag_id = ?", skinID, tag.ID).First(&existingLink).Error != nil {
			// 创建关联
			skinTag := models.SkinTag{SkinID: skinID, TagID: tag.ID}
			database.DB.Create(&skinTag)
		}
	}
}

// saveImages 保存图片到数据库
func saveImages(skinID uint, detail *WTLiveDetailResponse) {
	// 先删除旧的图片记录
	database.DB.Where("skin_id = ?", skinID).Delete(&models.SkinImage{})

	// 保存新的图片
	for i, img := range detail.Images {
		var imageURL string
		if img.MQ != nil {
			imageURL = img.MQ.Src
		} else if img.Orig != nil {
			imageURL = img.Orig.Src
		}

		if imageURL != "" {
			skinImage := models.SkinImage{
				SkinID: skinID,
				URL:    imageURL,
				Sort:   i, // 使用索引作为排序
			}
			database.DB.Create(&skinImage)
		}
	}
}

// extractTitle 提取标题
func extractTitle(pageTitle, description string) string {
	if pageTitle != "" {
		title := strings.TrimPrefix(pageTitle, "WT Live // ")
		if idx := strings.Index(title, " by "); idx > 0 {
			return strings.TrimSpace(title[:idx])
		}
		return title
	}
	return htmlToText(description)
}

// extractVehicleFromDescription 从描述中提取载具信息
func extractVehicleFromDescription(desc string) (vehicleType, country, class string) {
	return ExtractVehicleFromDescription(desc)
}

// ExtractVehicleFromDescription 从描述中提取载具信息（改进版）
func ExtractVehicleFromDescription(desc string) (vehicleType, country, class string) {
	descLower := strings.ToLower(desc)

	// 提取载具类型
	if strings.Contains(descLower, "tank") || strings.Contains(descLower, "panzer") {
		vehicleType = "tank"
	} else if strings.Contains(descLower, "aircraft") || strings.Contains(descLower, "plane") || 
		strings.Contains(descLower, "fighter") || strings.Contains(descLower, "bomber") {
		vehicleType = "aircraft"
	} else if strings.Contains(descLower, "helicopter") || strings.Contains(descLower, "heli") {
		vehicleType = "helicopter"
	} else if strings.Contains(descLower, "ship") || strings.Contains(descLower, "boat") || 
		strings.Contains(descLower, "destroyer") || strings.Contains(descLower, "cruiser") {
		vehicleType = "ship"
	}

	// 提取国家
	countries := map[string]string{
		"usa": "usa", "american": "usa", "us ": "usa",
		"germany": "germany", "german": "germany", "deutschland": "germany",
		"ussr": "ussr", "soviet": "ussr", "russian": "ussr", "russia": "ussr",
		"britain": "britain", "british": "britain", "uk": "britain",
		"japan": "japan", "japanese": "japan",
		"china": "china", "chinese": "china",
		"france": "france", "french": "france",
		"italy": "italy", "italian": "italy",
		"sweden": "sweden", "swedish": "sweden",
		"israel": "israel", "israeli": "israel",
	}
	for keyword, countryCode := range countries {
		if strings.Contains(descLower, keyword) {
			country = countryCode
			break
		}
	}

	// 提取载具子类型
	if vehicleType == "tank" {
		if strings.Contains(descLower, "heavy") {
			class = "heavy_tank"
		} else if strings.Contains(descLower, "medium") {
			class = "medium_tank"
		} else if strings.Contains(descLower, "light") {
			class = "light_tank"
		} else if strings.Contains(descLower, "destroyer") || strings.Contains(descLower, "td") {
			class = "tank_destroyer"
		} else if strings.Contains(descLower, "spaa") || strings.Contains(descLower, "anti-air") {
			class = "spaa"
		}
	} else if vehicleType == "aircraft" {
		if strings.Contains(descLower, "fighter") {
			class = "fighter"
		} else if strings.Contains(descLower, "attacker") || strings.Contains(descLower, "strike") {
			class = "attacker"
		} else if strings.Contains(descLower, "bomber") {
			class = "bomber"
		}
	} else if vehicleType == "ship" {
		if strings.Contains(descLower, "fleet") || strings.Contains(descLower, "destroyer") || 
			strings.Contains(descLower, "cruiser") || strings.Contains(descLower, "battleship") {
			class = "fleet"
		} else if strings.Contains(descLower, "coastal") || strings.Contains(descLower, "boat") {
			class = "coastal"
		}
	}

	return
}

// SyncSkinsFromWTLive 从 War Thunder Live 同步涂装数据
func SyncSkinsFromWTLive(vehicleType, vehicleCountry, vehicleClass, vehicle, sort string, period, page int) (int, error) {
	if vehicleType == "" {
		vehicleType = "any"
	}
	if vehicleCountry == "" {
		vehicleCountry = "any"
	}
	if vehicleClass == "" {
		vehicleClass = "any"
	}
	if vehicle == "" {
		vehicle = "any"
	}
	if sort == "" {
		sort = "created"
	}
	if period == 0 {
		period = 7
	}

	formData := url.Values{}
	formData.Set("content", "camouflage")
	formData.Set("sort", sort)
	formData.Set("user", "")
	formData.Set("period", fmt.Sprintf("%d", period))
	formData.Set("searchString", "")
	formData.Set("page", fmt.Sprintf("%d", page))
	formData.Set("featured", "0")
	formData.Set("subtype", "all")
	formData.Set("vehicleType", vehicleType)
	formData.Set("vehicleClass", vehicleClass)
	formData.Set("vehicleCountry", vehicleCountry)
	formData.Set("vehicle", vehicle)

	resp, err := http.PostForm(WTLiveAPI, formData)
	if err != nil {
		return 0, fmt.Errorf("请求失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, fmt.Errorf("读取响应失败: %w", err)
	}

	var wtResp WTLiveResponse
	if err := json.Unmarshal(body, &wtResp); err != nil {
		return 0, fmt.Errorf("解析响应失败: %w", err)
	}

	count := 0
	for _, item := range wtResp.Data.List {
		// 先保存列表中的基本元数据 (id 和 lang_group)
		langGroup := item.LangGroup
		wtLiveID := item.ID
		
		if langGroup == 0 {
			langGroup = wtLiveID
		}
		
		if wtLiveID > 0 {
			// 检查是否已存在，如果不存在则创建基本记录
			var existing models.Skin
			isNew := database.DB.Where("wt_live_id = ?", wtLiveID).First(&existing).Error != nil
			if isNew {
				// 创建基本记录，保存 id 和 lang_group
				basicSkin := models.Skin{
					WTLiveID:    wtLiveID,
					LangGroup:   langGroup,
					Title:       item.PageTitle,
					Description: item.Description,
					Likes:       item.Likes,
					Views:       item.Views,
					Downloads:   item.Downloads,
					Comments:    item.Comments,
					Featured:    item.Featured,
					CreatedTS:   item.Created,
				}
				database.DB.Create(&basicSkin)
			}
			
			// 获取详情并更新完整信息
			skin, err := FetchSkinDetail(langGroup)
			if err == nil {
				count++
			} else {
				continue
			}

			// 使用请求参数中的筛选条件回填载具信息（比解析 description 更可靠）
			updates := map[string]interface{}{}
			if vehicleType != "any" && vehicleType != "" && skin.VehicleType == "" {
				updates["vehicle_type"] = vehicleType
			}
			if vehicleClass != "any" && vehicleClass != "" && skin.VehicleClass == "" {
				updates["vehicle_class"] = vehicleClass
			}
			if vehicleCountry != "any" && vehicleCountry != "" {
				// 更新国家列表
				var countries []string
				if skin.VehicleCountries != "" && skin.VehicleCountries != "null" && skin.VehicleCountries != "[]" {
					json.Unmarshal([]byte(skin.VehicleCountries), &countries)
				}
				hasCountry := false
				for _, c := range countries {
					if c == vehicleCountry {
						hasCountry = true
						break
					}
				}
				if !hasCountry {
					countries = append(countries, vehicleCountry)
					countriesJSON, _ := json.Marshal(countries)
					updates["vehicle_countries"] = string(countriesJSON)
				}
			}
			if len(updates) > 0 {
				database.DB.Model(skin).Updates(updates)
			}

			// 如果指定了具体载具，创建 SkinVehicle 关联并回填载具名称
			if vehicle != "any" && vehicle != "" {
				var existingRelation models.SkinVehicle
				if database.DB.Where("skin_id = ? AND vehicle_id = ?", skin.ID, vehicle).First(&existingRelation).Error != nil {
					skinVehicle := models.SkinVehicle{
						SkinID:    skin.ID,
						VehicleID: vehicle,
					}
					database.DB.Create(&skinVehicle)
				}
				// 回填载具名称（如果为空）
				if skin.VehicleName == "" {
					var vehicleInfo models.Vehicle
					if database.DB.Where("wt_live_id = ?", vehicle).First(&vehicleInfo).Error == nil && vehicleInfo.Name != "" {
						database.DB.Model(skin).Update("vehicle_name", vehicleInfo.Name)
					}
				}
			}
		}
	}

	return count, nil
}

// FetchAndReturnSkins 从数据库查询涂装
func FetchAndReturnSkins(vehicleType, vehicleCountry, vehicleClass, vehicle, sort, search string, period, page, pageSize int) ([]models.Skin, int64, error) {
	var skins []models.Skin
	var total int64

	if pageSize <= 0 {
		pageSize = 10
	}

	query := database.DB.Model(&models.Skin{})

	// 如果指定了具体载具，只通过关联表查询，忽略其他载具筛选条件
	if vehicle != "" && vehicle != "any" {
		// 通过 skin_vehicles 关联表查询
		query = query.Where("id IN (?)", 
			database.DB.Table("skin_vehicles").
				Select("skin_vehicles.skin_id").
				Where("skin_vehicles.vehicle_id = ?", vehicle),
		)
	} else {
		// 没有指定具体载具时，使用类型/国家/子类型筛选
		if vehicleType != "" && vehicleType != "any" {
			query = query.Where("vehicle_type = ?", vehicleType)
		}
		if vehicleCountry != "" && vehicleCountry != "any" {
			// 在 JSON 数组中搜索国家
			query = query.Where("JSON_CONTAINS(vehicle_countries, ?)", fmt.Sprintf("\"%s\"", vehicleCountry))
		}
		if vehicleClass != "" && vehicleClass != "any" {
			query = query.Where("vehicle_class = ?", vehicleClass)
		}
	}
	
	if search != "" {
		query = query.Where("title LIKE ? OR description LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	sortMap := map[string]string{
		"created":   "id DESC",
		"likes":     "likes DESC",
		"views":     "views DESC",
		"downloads": "downloads DESC",
	}
	if orderBy, ok := sortMap[sort]; ok {
		query = query.Order(orderBy)
	} else {
		query = query.Order("id DESC")
	}

	query.Count(&total)
	query.Offset(page * pageSize).Limit(pageSize).Find(&skins)

	return skins, total, nil
}

func htmlToText(html string) string {
	reTag := regexp.MustCompile(`<[^>]*>`)
	text := reTag.ReplaceAllString(html, "")
	text = strings.ReplaceAll(text, "&nbsp;", " ")
	text = strings.ReplaceAll(text, "&amp;", "&")
	text = strings.ReplaceAll(text, "&lt;", "<")
	text = strings.ReplaceAll(text, "&gt;", ">")
	text = strings.ReplaceAll(text, "&quot;", "\"")
	text = strings.TrimSpace(text)
	if len(text) > 200 {
		text = text[:200] + "..."
	}
	return text
}
