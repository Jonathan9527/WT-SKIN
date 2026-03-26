// 解析 War Thunder Live filters 数据生成四级分类 JSON
const fs = require('fs');

// 读取 filters 数据
const filtersJson = fs.readFileSync('filters_data.json', 'utf8');
const filters = JSON.parse(filtersJson);

// 初始化结构
const vehicles = {
  tank: {},
  aircraft: {},
  helicopter: {},
  ship: {}
};

// 国家映射
const countryMap = {
  'britain': 'britain',
  'china': 'china',
  'france': 'france',
  'germany': 'germany',
  'israel': 'israel',
  'italy': 'italy',
  'japan': 'japan',
  'south_africa': 'south_africa',
  'sweden': 'sweden',
  'usa': 'usa',
  'ussr': 'ussr'
};

// 类型映射
const typeMap = {
  'aircraft': 'aircraft',
  'helicopter': 'helicopter',
  'ship': 'ship',
  'tank': 'tank'
};

// 子类型映射（简化）
const classMap = {
  // 坦克
  'light_tank': 'light_tank',
  'medium_tank': 'medium_tank',
  'heavy_tank': 'heavy_tank',
  'tank_destroyer': 'tank_destroyer',
  'spaa': 'spaa',
  'missile_tank': 'missile_tank',
  
  // 飞机
  'fighter': 'fighter',
  'jet_fighter': 'fighter',
  'bomber': 'bomber',
  'jet_bomber': 'bomber',
  'assault': 'attacker',
  'strike_aircraft': 'attacker',
  'torpedo': 'bomber',
  'dive_bomber': 'bomber',
  'frontline_bomber': 'bomber',
  'longrange_bomber': 'bomber',
  'light_bomber': 'bomber',
  'interceptor': 'fighter',
  'aa_fighter': 'fighter',
  'naval_aircraft': 'fighter',
  'strike_ucav': 'attacker',
  
  // 直升机
  'attack_helicopter': 'attack',
  'utility_helicopter': 'utility',
  
  // 舰船
  'destroyer': 'fleet',
  'cruiser': 'fleet',
  'battleship': 'fleet',
  'battlecruiser': 'fleet',
  'heavy_cruiser': 'fleet',
  'light_cruiser': 'fleet',
  'frigate': 'fleet',
  'torpedo_boat': 'coastal',
  'gun_boat': 'coastal',
  'armored_boat': 'coastal',
  'heavy_boat': 'coastal',
  'submarine_chaser': 'coastal',
  'barge': 'coastal',
  'minelayer': 'fleet',
  'naval_aa_ferry': 'coastal',
  'naval_ferry_barge': 'coastal',
  'torpedo_gun_boat': 'coastal',
  'heavy_gun_boat': 'coastal'
};

// 初始化所有国家的结构
Object.keys(typeMap).forEach(type => {
  Object.keys(countryMap).forEach(country => {
    vehicles[type][country] = {};
  });
});

// 处理载具列表
const vehicleVariants = filters.vehicle.variants;
let stats = {
  total: 0,
  byType: {},
  byCountry: {}
};

vehicleVariants.forEach(variant => {
  if (variant.separator || variant.value === 'any') return;
  
  const vehicleId = variant.value;
  const vehicleName = variant.name;
  const count = variant.count || 0;
  const dep = variant.dep || {};
  
  // 获取依赖
  const countries = dep.vehicleCountry || [];
  const types = dep.vehicleType || [];
  const classes = dep.vehicleClass || [];
  
  if (countries.length === 0 || types.length === 0) return;
  
  stats.total++;
  
  // 处理每个类型
  types.forEach(type => {
    if (!typeMap[type]) return;
    const mappedType = typeMap[type];
    
    stats.byType[mappedType] = (stats.byType[mappedType] || 0) + 1;
    
    // 处理每个国家
    countries.forEach(country => {
      if (!countryMap[country]) return;
      const mappedCountry = countryMap[country];
      
      stats.byCountry[mappedCountry] = (stats.byCountry[mappedCountry] || 0) + 1;
      
      // 确定子类型（使用第一个匹配的）
      let mappedClass = 'other';
      for (const cls of classes) {
        if (classMap[cls]) {
          mappedClass = classMap[cls];
          break;
        }
      }
      
      // 初始化子类型数组
      if (!vehicles[mappedType][mappedCountry][mappedClass]) {
        vehicles[mappedType][mappedCountry][mappedClass] = [];
      }
      
      // 添加载具
      vehicles[mappedType][mappedCountry][mappedClass].push({
        id: vehicleId,
        name: vehicleName,
        skin_count: count
      });
    });
  });
});

// 清理空的分类
Object.keys(vehicles).forEach(type => {
  Object.keys(vehicles[type]).forEach(country => {
    // 如果国家下没有任何载具，删除该国家
    if (Object.keys(vehicles[type][country]).length === 0) {
      delete vehicles[type][country];
    } else {
      // 排序载具
      Object.keys(vehicles[type][country]).forEach(cls => {
        vehicles[type][country][cls].sort((a, b) => a.name.localeCompare(b.name));
      });
    }
  });
});

// 保存结果
fs.writeFileSync('server/data/vehicles_from_api.json', JSON.stringify(vehicles, null, 2), 'utf8');

// 打印统计
console.log('✅ 生成完成！');
console.log('');
console.log('统计信息:');
console.log(`  总载具数: ${stats.total}`);
console.log('');
console.log('按类型统计:');
Object.keys(stats.byType).sort().forEach(type => {
  console.log(`  ${type}: ${stats.byType[type]}`);
});
console.log('');
console.log('按国家统计:');
Object.keys(stats.byCountry).sort().forEach(country => {
  console.log(`  ${country}: ${stats.byCountry[country]}`);
});
console.log('');
console.log('已保存到: server/data/vehicles_from_api.json');
