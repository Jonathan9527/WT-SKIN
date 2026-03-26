#!/usr/bin/env python3
"""
从 wt_vehicle_skins.json 生成四级分类的 vehicles.json
"""

import json
import re
from collections import defaultdict

# 载具类型关键词映射
TYPE_KEYWORDS = {
    'tank': ['tank', 'panzer', 'pz', 'kv', 'is', 't_', 'sherman', 'tiger', 'panther', 'leopard', 'abrams', 'merkava', 'leclerc', 'challenger', 'chieftain', 'centurion'],
    'aircraft': ['bf', 'fw', 'me', 'he', 'ju', 'do', 'spitfire', 'hurricane', 'typhoon', 'tempest', 'mosquito', 'lancaster', 'halifax', 'wellington', 'p_', 'f_', 'b_', 'a_', 'mig', 'yak', 'la_', 'il_', 'pe_', 'tu_', 'su_', 'i_16', 'ki_', 'j_', 'n1k', 'a6m', 'g4m', 'h6k', 'h8k', 'b5n', 'b6n', 'd3a', 'd4y', 'sabre', 'phantom', 'corsair', 'hellcat', 'wildcat', 'avenger', 'dauntless', 'devastator', 'catalina', 'liberator', 'fortress', 'superfortress', 'marauder', 'mitchell', 'havoc', 'invader', 'mustang', 'thunderbolt', 'lightning', 'airacobra', 'kingcobra', 'warhawk', 'tomahawk', 'kittyhawk'],
    'helicopter': ['ah_', 'mi_', 'ka_', 'uh_', 'ch_', 'hkp', 'alouette', 'gazelle', 'lynx', 'apache', 'cobra', 'huey', 'hind', 'havoc', 'hokum', 'alligator', 'rooivalk', 'mangusta', 'tiger', 'puma', 'bo_105', 'ec_665'],
    'ship': ['destroyer', 'cruiser', 'battleship', 'carrier', 'submarine', 'boat', 'pt_', 'mtb', 'torpedo', 'fletcher', 'gearing', 'sumner', 'brooklyn', 'cleveland', 'baltimore', 'portland', 'pensacola', 'northampton', 'new_orleans', 'atlanta', 'omaha', 'clemson', 'wickes', 'mahan', 'benson', 'sims', 'farragut']
}

# 国家关键词映射
COUNTRY_KEYWORDS = {
    'usa': ['us_', 'usa_', 'american'],
    'germany': ['germ_', 'ger_', 'german'],
    'ussr': ['ussr_', 'soviet', 'russian'],
    'britain': ['uk_', 'britain_', 'british'],
    'japan': ['jp_', 'japan_', 'japanese'],
    'china': ['cn_', 'china_', 'chinese'],
    'italy': ['it_', 'italy_', 'italian'],
    'france': ['fr_', 'france_', 'french'],
    'sweden': ['sw_', 'sweden_', 'swedish'],
    'israel': ['il_', 'israel_', 'israeli']
}

# 子类型关键词映射
CLASS_KEYWORDS = {
    'tank': {
        'light_tank': ['light', 'lt', 'scout', 'reconnaissance', 'locust', 'chaffee', 'stuart', 'walker', 'bulldog', 'sheridan', 'bradley', 'warrior', 'marder', 'bmp', 'btr', 'pt_76', 'asu'],
        'medium_tank': ['medium', 'mt', 'sherman', 't_34', 't_44', 't_54', 't_55', 't_62', 't_64', 't_72', 't_80', 't_90', 'panther', 'panzer_iv', 'pz_iv', 'm26', 'm46', 'm47', 'm48', 'm60', 'centurion', 'chieftain', 'challenger', 'leopard', 'abrams', 'merkava', 'leclerc', 'ariete', 'type_', 'chi_'],
        'heavy_tank': ['heavy', 'ht', 'tiger', 'king_tiger', 'tiger_ii', 'panther_ii', 'maus', 'e_', 'kv_', 'is_', 'isu_', 'su_', 't29', 't30', 't32', 't34', 't95', 'm103', 'conqueror', 'fv', 'churchill', 'black_prince', 'caernarvon', 'jumbo'],
        'tank_destroyer': ['destroyer', 'td', 'jagd', 'stug', 'hetzer', 'nashorn', 'ferdinand', 'elefant', 'su_85', 'su_100', 'su_122', 'su_152', 'isu_122', 'isu_152', 'm10', 'm18', 'm36', 'm56', 'hellcat', 'wolverine', 'jackson', 'archer', 'achilles', 'firefly', 'avenger', 'charioteer', 'strv', 'ikv', 'pvkv', 'sav'],
        'spaa': ['spaa', 'aa', 'flak', 'wirbelwind', 'ostwind', 'coelian', 'kugelblitz', 'gepard', 'zsu', 'shilka', 'tunguska', 'pantsir', 'm16', 'm19', 'm42', 'duster', 'york', 'marksman', 'falcon', 'chieftain_marksman', 'lvkv', 'veak', 'otomatic', 'sidam', 'type_87']
    },
    'aircraft': {
        'fighter': ['fighter', 'bf_109', 'bf_110', 'fw_190', 'me_', 'spitfire', 'hurricane', 'typhoon', 'tempest', 'p_38', 'p_39', 'p_40', 'p_47', 'p_51', 'p_63', 'f2a', 'f4f', 'f4u', 'f6f', 'f7f', 'f8f', 'f_80', 'f_84', 'f_86', 'f_100', 'f_104', 'f_4', 'f_5', 'f_14', 'f_15', 'f_16', 'f_18', 'mig_', 'yak_', 'la_', 'i_16', 'ki_', 'a6m', 'j2m', 'n1k', 'ki_84', 'ki_61', 'ki_43', 'ki_27', 'mirage', 'mystere', 'etendard', 'super_etendard', 'jaguar', 'tornado', 'eurofighter', 'gripen', 'draken', 'viggen', 'kfir', 'nesher'],
        'attacker': ['attacker', 'strike', 'ground_attack', 'il_2', 'il_10', 'su_6', 'hs_129', 'ju_87', 'stuka', 'a_20', 'a_26', 'a_1', 'a_4', 'a_6', 'a_7', 'a_10', 'su_25', 'su_17', 'su_22', 'su_24', 'harrier', 'buccaneer', 'canberra', 'mosquito', 'beaufighter'],
        'bomber': ['bomber', 'b_17', 'b_24', 'b_25', 'b_26', 'b_29', 'b_57', 'lancaster', 'halifax', 'wellington', 'stirling', 'lincoln', 'he_111', 'he_177', 'ju_88', 'ju_188', 'do_17', 'do_217', 'pe_2', 'pe_8', 'tu_2', 'tu_4', 'tu_14', 'tu_16', 'tu_22', 'tu_95', 'tu_160', 'g4m', 'g5n', 'g8n', 'h6k', 'h8k', 'p1y', 'ki_49', 'ki_67']
    },
    'helicopter': {
        'attack': ['ah_', 'mi_24', 'mi_28', 'ka_50', 'ka_52', 'apache', 'cobra', 'mangusta', 'tiger', 'rooivalk', 'z_', 'wz_'],
        'utility': ['uh_', 'ch_', 'mi_4', 'mi_8', 'huey', 'iroquois', 'alouette', 'gazelle', 'lynx', 'puma', 'bo_105', 'hkp']
    },
    'ship': {
        'fleet': ['destroyer', 'cruiser', 'battleship', 'carrier', 'fletcher', 'gearing', 'sumner', 'brooklyn', 'cleveland', 'baltimore', 'portland', 'pensacola', 'northampton', 'new_orleans', 'atlanta', 'omaha', 'fuso', 'ise', 'kongo', 'nagato', 'yamato', 'mogami', 'tone', 'takao', 'myoko', 'aoba', 'furutaka', 'kako', 'kirov', 'chapayev', 'sverdlov', 'kronshtadt', 'stalingrad'],
        'coastal': ['boat', 'pt_', 'mtb', 'torpedo', 'elco', 'higgins', 's_boot', 'ls_boot', 'pr_', 'g_5', 'type_', 'ha_go']
    }
}

def detect_vehicle_type(vehicle_id, vehicle_name):
    """检测载具类型"""
    vehicle_id_lower = vehicle_id.lower()
    vehicle_name_lower = vehicle_name.lower()
    
    for vtype, keywords in TYPE_KEYWORDS.items():
        for keyword in keywords:
            if keyword in vehicle_id_lower or keyword in vehicle_name_lower:
                return vtype
    
    return 'unknown'

def detect_country(vehicle_id, vehicle_name):
    """检测国家"""
    vehicle_id_lower = vehicle_id.lower()
    
    for country, keywords in COUNTRY_KEYWORDS.items():
        for keyword in keywords:
            if vehicle_id_lower.startswith(keyword):
                return country
    
    # 根据名称中的特殊字符判断
    if '▄' in vehicle_name:  # 租借载具
        return 'britain'  # 默认英国
    
    return 'unknown'

def detect_class(vehicle_type, vehicle_id, vehicle_name):
    """检测子类型"""
    if vehicle_type not in CLASS_KEYWORDS:
        return 'unknown'
    
    vehicle_id_lower = vehicle_id.lower()
    vehicle_name_lower = vehicle_name.lower()
    
    for vclass, keywords in CLASS_KEYWORDS[vehicle_type].items():
        for keyword in keywords:
            if keyword in vehicle_id_lower or keyword in vehicle_name_lower:
                return vclass
    
    # 默认值
    if vehicle_type == 'tank':
        return 'medium_tank'
    elif vehicle_type == 'aircraft':
        return 'fighter'
    elif vehicle_type == 'helicopter':
        return 'attack'
    elif vehicle_type == 'ship':
        return 'fleet'
    
    return 'unknown'

def clean_vehicle_name(name):
    """清理载具名称"""
    # 移除 HTML 实体
    name = name.replace('&nbsp;', ' ')
    name = name.replace('▄', '')
    name = name.strip()
    return name

def main():
    # 读取原始数据
    with open('wt_vehicle_skins.json', 'r', encoding='utf-8') as f:
        skins_data = json.load(f)
    
    # 构建四级分类结构
    vehicles_tree = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    
    # 统计信息
    stats = {
        'total': 0,
        'by_type': defaultdict(int),
        'by_country': defaultdict(int),
        'unknown_type': [],
        'unknown_country': []
    }
    
    # 处理每个载具
    for vehicle_id, vehicle_info in skins_data.items():
        vehicle_name = clean_vehicle_name(vehicle_info['name'])
        
        # 检测分类
        vtype = detect_vehicle_type(vehicle_id, vehicle_name)
        country = detect_country(vehicle_id, vehicle_name)
        vclass = detect_class(vtype, vehicle_id, vehicle_name)
        
        # 统计
        stats['total'] += 1
        stats['by_type'][vtype] += 1
        stats['by_country'][country] += 1
        
        if vtype == 'unknown':
            stats['unknown_type'].append(vehicle_id)
        if country == 'unknown':
            stats['unknown_country'].append(vehicle_id)
        
        # 跳过未知类型
        if vtype == 'unknown' or country == 'unknown':
            continue
        
        # 添加到树结构
        vehicle_entry = {
            'id': vehicle_id,
            'name': vehicle_name,
            'skin_count': vehicle_info.get('count', 0)
        }
        
        vehicles_tree[vtype][country][vclass].append(vehicle_entry)
    
    # 排序
    for vtype in vehicles_tree:
        for country in vehicles_tree[vtype]:
            for vclass in vehicles_tree[vtype][country]:
                vehicles_tree[vtype][country][vclass].sort(key=lambda x: x['name'])
    
    # 转换为普通字典
    result = {}
    for vtype in vehicles_tree:
        result[vtype] = {}
        for country in vehicles_tree[vtype]:
            result[vtype][country] = {}
            for vclass in vehicles_tree[vtype][country]:
                result[vtype][country][vclass] = vehicles_tree[vtype][country][vclass]
    
    # 保存结果
    with open('server/data/vehicles_generated.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    # 打印统计信息
    print(f"总载具数: {stats['total']}")
    print(f"\n按类型统计:")
    for vtype, count in sorted(stats['by_type'].items()):
        print(f"  {vtype}: {count}")
    
    print(f"\n按国家统计:")
    for country, count in sorted(stats['by_country'].items()):
        print(f"  {country}: {count}")
    
    if stats['unknown_type']:
        print(f"\n未识别类型的载具 ({len(stats['unknown_type'])}个):")
        for vid in stats['unknown_type'][:10]:
            print(f"  {vid}")
        if len(stats['unknown_type']) > 10:
            print(f"  ... 还有 {len(stats['unknown_type']) - 10} 个")
    
    if stats['unknown_country']:
        print(f"\n未识别国家的载具 ({len(stats['unknown_country'])}个):")
        for vid in stats['unknown_country'][:10]:
            print(f"  {vid}")
        if len(stats['unknown_country']) > 10:
            print(f"  ... 还有 {len(stats['unknown_country']) - 10} 个")
    
    print(f"\n✅ 已生成 server/data/vehicles_generated.json")

if __name__ == '__main__':
    main()
