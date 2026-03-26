package main

import (
	"fmt"
	"os"
	"warthunder-plugin/api"
)

func main() {
	fmt.Println("War Thunder 涂装下载器")
	fmt.Println("Version 1.0.0")
	fmt.Println("=============================")
	
	// 检查管理员权限
	if !isAdmin() {
		fmt.Println("请以管理员权限运行此程序")
		fmt.Println("按任意键退出...")
		fmt.Scanln()
		os.Exit(1)
	}
	
	// 显示菜单
	showMenu()
}

func showMenu() {
	client := api.NewClient()
	
	for {
		fmt.Println("\n请选择操作:")
		fmt.Println("1. 搜索涂装")
		fmt.Println("2. 浏览热门涂装")
		fmt.Println("3. 按国家筛选")
		fmt.Println("4. 下载涂装")
		fmt.Println("5. 退出")
		fmt.Print("\n请输入选项 (1-5): ")
		
		var choice string
		fmt.Scanln(&choice)
		
		switch choice {
		case "1":
			searchCamouflage(client)
		case "2":
			browsePopular(client)
		case "3":
			filterByCountry(client)
		case "4":
			downloadCamouflage(client)
		case "5":
			fmt.Println("再见!")
			return
		default:
			fmt.Println("无效选项，请重新选择")
		}
	}
}

func searchCamouflage(client *api.Client) {
	fmt.Print("\n请输入搜索关键词: ")
	var keyword string
	fmt.Scanln(&keyword)
	
	params := api.SearchParams{
		Content:        api.ContentCamouflage,
		Sort:           api.SortCreated,
		Period:         7,
		SearchString:   keyword,
		Page:           0,
		Featured:       0,
		Subtype:        "all",
		VehicleType:    "any",
		VehicleCountry: api.CountryAny,
		VehicleClass:   "any",
		Vehicle:        "any",
	}
	
	resp, err := client.Search(params)
	if err != nil {
		fmt.Printf("搜索失败: %v\n", err)
		return
	}
	
	displayResults(resp)
}

func browsePopular(client *api.Client) {
	fmt.Println("\n正在获取热门涂装...")
	
	params := api.SearchParams{
		Content:        api.ContentCamouflage,
		Sort:           api.SortLikes,
		Period:         7,
		Page:           0,
		Featured:       0,
		Subtype:        "all",
		VehicleType:    "any",
		VehicleCountry: api.CountryAny,
		VehicleClass:   "any",
		Vehicle:        "any",
	}
	
	resp, err := client.Search(params)
	if err != nil {
		fmt.Printf("获取失败: %v\n", err)
		return
	}
	
	displayResults(resp)
}

func filterByCountry(client *api.Client) {
	fmt.Println("\n选择国家:")
	fmt.Println("1. 美国 (USA)")
	fmt.Println("2. 德国 (Germany)")
	fmt.Println("3. 苏联 (USSR)")
	fmt.Println("4. 英国 (Britain)")
	fmt.Println("5. 日本 (Japan)")
	fmt.Println("6. 中国 (China)")
	fmt.Println("7. 意大利 (Italy)")
	fmt.Println("8. 法国 (France)")
	fmt.Println("9. 瑞典 (Sweden)")
	fmt.Println("10. 以色列 (Israel)")
	fmt.Print("\n请输入选项: ")
	
	var choice string
	fmt.Scanln(&choice)
	
	countryMap := map[string]api.VehicleCountry{
		"1":  api.CountryUSA,
		"2":  api.CountryGermany,
		"3":  api.CountryUSSR,
		"4":  api.CountryBritain,
		"5":  api.CountryJapan,
		"6":  api.CountryChina,
		"7":  api.CountryItaly,
		"8":  api.CountryFrance,
		"9":  api.CountrySweden,
		"10": api.CountryIsrael,
	}
	
	country, ok := countryMap[choice]
	if !ok {
		fmt.Println("无效选项")
		return
	}
	
	params := api.SearchParams{
		Content:        api.ContentCamouflage,
		Sort:           api.SortCreated,
		Period:         7,
		Page:           0,
		Featured:       0,
		Subtype:        "all",
		VehicleType:    "any",
		VehicleCountry: country,
		VehicleClass:   "any",
		Vehicle:        "any",
	}
	
	resp, err := client.Search(params)
	if err != nil {
		fmt.Printf("获取失败: %v\n", err)
		return
	}
	
	displayResults(resp)
}

func downloadCamouflage(client *api.Client) {
	fmt.Println("\n下载功能开发中...")
	// TODO: 实现下载逻辑
}

func displayResults(resp *api.APIResponse) {
	if resp.Status != "OK" {
		fmt.Println("API 返回错误状态")
		return
	}
	
	if len(resp.Data.List) == 0 {
		fmt.Println("没有找到结果")
		return
	}
	
	fmt.Printf("\n找到 %d 个结果:\n", len(resp.Data.List))
	fmt.Println("=============================")
	
	for i, item := range resp.Data.List {
		fmt.Printf("\n[%d] ID: %d\n", i+1, item.ID)
		fmt.Printf("    作者: %s\n", item.Author.Nickname)
		fmt.Printf("    点赞: %d | 浏览: %d | 下载: %d\n", item.Likes, item.Views, item.Downloads)
		
		if item.File != nil {
			fmt.Printf("    文件: %s (%.2f MB)\n", item.File.Name, float64(item.File.Size)/1024/1024)
			fmt.Printf("    下载链接: %s\n", item.File.Link)
		}
	}
}

func isAdmin() bool {
	// TODO: 实现管理员权限检查
	return true
}
