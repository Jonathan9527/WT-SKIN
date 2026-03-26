# 从 wt_vehicle_skins.json 生成四级分类的 vehicles.json

$skinsData = Get-Content "wt_vehicle_skins.json" -Raw | ConvertFrom-Json

# 初始化结构
$vehicles = @{
    tank = @{
        usa = @{}
        germany = @{}
        ussr = @{}
        britain = @{}
        japan = @{}
        china = @{}
        italy = @{}
        france = @{}
        sweden = @{}
        israel = @{}
    }
    aircraft = @{
        usa = @{}
        germany = @{}
        ussr = @{}
        britain = @{}
        japan = @{}
        china = @{}
        italy = @{}
        france = @{}
        sweden = @{}
        israel = @{}
    }
    helicopter = @{
        usa = @{}
        germany = @{}
        ussr = @{}
        britain = @{}
        japan = @{}
        china = @{}
        italy = @{}
        france = @{}
        sweden = @{}
        israel = @{}
    }
    ship = @{
        usa = @{}
        germany = @{}
        ussr = @{}
        britain = @{}
        japan = @{}
        china = @{}
        italy = @{}
        france = @{}
        sweden = @{}
        israel = @{}
    }
}

$stats = @{
    total = 0
    aircraft = 0
    tank = 0
    helicopter = 0
    ship = 0
    unknown = 0
}

# 处理每个载具
$skinsData.PSObject.Properties | ForEach-Object {
    $vehicleId = $_.Name
    $vehicleName = $_.Value.name -replace '&nbsp;', ' ' -replace '▄', ''
    $skinCount = $_.Value.count
    
    $stats.total++
    
    # 检测类型
    $type = "unknown"
    if ($vehicleId -match "^(ah_|mi_|ka_|uh_|ch_|hkp|ec_665|bo_105|tiger|puma|lynx|gazelle|alouette|apache|cobra|huey|hind|havoc|hokum|alligator|rooivalk|mangusta)") {
        $type = "helicopter"
        $stats.helicopter++
    }
    elseif ($vehicleId -match "(destroyer|cruiser|battleship|carrier|submarine|boat|pt_|mtb|torpedo|fletcher|gearing|sumner)") {
        $type = "ship"
        $stats.ship++
    }
    elseif ($vehicleId -match "^(bf|fw|me|he|ju|do|spitfire|hurricane|typhoon|tempest|mosquito|lancaster|halifax|wellington|p_|f_|b_|a_|mig|yak|la_|il_|pe_|tu_|su_|i_16|ki_|j_|n1k|a6m|g4m|h6k|h8k|b5n|b6n|d3a|d4y|sabre|phantom|corsair|hellcat|wildcat|avenger|dauntless|devastator|catalina|liberator|fortress|superfortress|marauder|mitchell|havoc|invader|mustang|thunderbolt|lightning|airacobra|kingcobra|warhawk|tomahawk|kittyhawk|attaker|beaufighter|beaufort|blenheim|boomerang|boston|brigand|buccaneer|canberra|cf_|firecrest)") {
        $type = "aircraft"
        $stats.aircraft++
    }
    else {
        $type = "tank"
        $stats.tank++
    }
    
    # 检测国家
    $country = "unknown"
    if ($vehicleId -match "^(us_|usa_)") { $country = "usa" }
    elseif ($vehicleId -match "^(germ_|ger_)") { $country = "germany" }
    elseif ($vehicleId -match "^(ussr_|soviet_)") { $country = "ussr" }
    elseif ($vehicleId -match "^(uk_|britain_)") { $country = "britain" }
    elseif ($vehicleId -match "^(jp_|japan_)") { $country = "japan" }
    elseif ($vehicleId -match "^(cn_|china_)") { $country = "china" }
    elseif ($vehicleId -match "^(it_|italy_)") { $country = "italy" }
    elseif ($vehicleId -match "^(fr_|france_)") { $country = "france" }
    elseif ($vehicleId -match "^(sw_|sweden_)") { $country = "sweden" }
    elseif ($vehicleId -match "^(il_|israel_)") { $country = "israel" }
    else {
        # 根据名称特征判断
        if ($vehicleName -match "(Spitfire|Hurricane|Typhoon|Tempest|Lancaster|Halifax|Wellington|Mosquito|Canberra|Buccaneer|Harrier|Jaguar|Tornado|Chieftain|Challenger|Centurion|Churchill|Cromwell|Crusader|Valentine|Matilda)") {
            $country = "britain"
        }
        elseif ($vehicleName -match "(Bf |Fw |Me |He |Ju |Do |Tiger|Panther|Leopard|Panzer)") {
            $country = "germany"
        }
        elseif ($vehicleName -match "(MiG|Yak|La-|Il-|Pe-|Tu-|Su-|T-|KV-|IS-|ZSU)") {
            $country = "ussr"
        }
        elseif ($vehicleName -match "(P-|F-|B-|A-|M\d|Sherman|Abrams|Patton|Pershing|Hellcat|Thunderbolt|Mustang|Lightning|Sabre|Phantom)") {
            $country = "usa"
        }
        elseif ($vehicleName -match "(Ki-|J\d|A\d|N\d|Type |Chi-|Ho-|Ha-|Ke-)") {
            $country = "japan"
        }
        else {
            $stats.unknown++
        }
    }
    
    if ($country -eq "unknown" -or $type -eq "unknown") {
        return
    }
    
    # 检测子类型
    $class = "other"
    if ($type -eq "tank") {
        if ($vehicleId -match "(light|lt|scout|locust|chaffee|stuart|walker|bulldog|sheridan|bradley|warrior|marder|bmp|btr|pt_76|asu)") {
            $class = "light_tank"
        }
        elseif ($vehicleId -match "(heavy|ht|tiger|king_tiger|tiger_ii|maus|kv_|is_|t29|t30|t32|t34|t95|m103|conqueror|churchill|jumbo)") {
            $class = "heavy_tank"
        }
        elseif ($vehicleId -match "(destroyer|td|jagd|stug|hetzer|nashorn|ferdinand|elefant|su_85|su_100|su_122|su_152|isu|m10|m18|m36|hellcat|wolverine|jackson|archer|achilles|firefly|avenger|charioteer|strv|ikv|pvkv|sav)") {
            $class = "tank_destroyer"
        }
        elseif ($vehicleId -match "(spaa|aa|flak|wirbelwind|ostwind|coelian|kugelblitz|gepard|zsu|shilka|tunguska|pantsir|m16|m19|m42|duster|york|marksman|falcon|lvkv|veak|otomatic|sidam|type_87)") {
            $class = "spaa"
        }
        else {
            $class = "medium_tank"
        }
    }
    elseif ($type -eq "aircraft") {
        if ($vehicleId -match "(bomber|b_17|b_24|b_25|b_26|b_29|b_57|lancaster|halifax|wellington|stirling|lincoln|he_111|he_177|ju_88|ju_188|do_17|do_217|pe_2|pe_8|tu_2|tu_4|tu_14|tu_16|tu_22|tu_95|tu_160|g4m|g5n|g8n|h6k|h8k|p1y|ki_49|ki_67)") {
            $class = "bomber"
        }
        elseif ($vehicleId -match "(attacker|strike|ground_attack|il_2|il_10|su_6|hs_129|ju_87|stuka|a_20|a_26|a_1|a_4|a_6|a_7|a_10|su_25|su_17|su_22|su_24|harrier|buccaneer|canberra|mosquito|beaufighter)") {
            $class = "attacker"
        }
        else {
            $class = "fighter"
        }
    }
    elseif ($type -eq "helicopter") {
        if ($vehicleId -match "(ah_|mi_24|mi_28|ka_50|ka_52|apache|cobra|mangusta|tiger|rooivalk|z_|wz_)") {
            $class = "attack"
        }
        else {
            $class = "utility"
        }
    }
    elseif ($type -eq "ship") {
        if ($vehicleId -match "(boat|pt_|mtb|torpedo|elco|higgins|s_boot|ls_boot|pr_|g_5|type_|ha_go)") {
            $class = "coastal"
        }
        else {
            $class = "fleet"
        }
    }
    
    # 添加到结构
    if (-not $vehicles[$type][$country].ContainsKey($class)) {
        $vehicles[$type][$country][$class] = @()
    }
    
    $vehicles[$type][$country][$class] += @{
        id = $vehicleId
        name = $vehicleName
    }
}

# 清理空的分类
foreach ($type in $vehicles.Keys) {
    foreach ($country in $vehicles[$type].Keys) {
        $emptyClasses = @()
        foreach ($class in $vehicles[$type][$country].Keys) {
            if ($vehicles[$type][$country][$class].Count -eq 0) {
                $emptyClasses += $class
            }
        }
        foreach ($class in $emptyClasses) {
            $vehicles[$type][$country].Remove($class)
        }
    }
}

# 保存结果
$vehicles | ConvertTo-Json -Depth 10 | Set-Content "server/data/vehicles_generated.json" -Encoding UTF8

# 打印统计
Write-Host "✅ 生成完成！"
Write-Host ""
Write-Host "统计信息:"
Write-Host "  总载具数: $($stats.total)"
Write-Host "  飞机: $($stats.aircraft)"
Write-Host "  坦克: $($stats.tank)"
Write-Host "  直升机: $($stats.helicopter)"
Write-Host "  舰船: $($stats.ship)"
Write-Host "  未识别: $($stats.unknown)"
Write-Host ""
Write-Host "已保存到: server/data/vehicles_generated.json"
