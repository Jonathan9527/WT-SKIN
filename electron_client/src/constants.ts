export const VEHICLE_TYPES: Record<string, string> = {
  any: '全部类型', tank: '坦克', aircraft: '飞机', helicopter: '直升机', ship: '舰船',
};
export const COUNTRIES: Record<string, string> = {
  any: '全部国家', usa: '美国', germany: '德国', ussr: '苏联', britain: '英国',
  japan: '日本', china: '中国', france: '法国', italy: '意大利', sweden: '瑞典', israel: '以色列',
};
export const VEHICLE_CLASSES: Record<string, Record<string, string>> = {
  tank: { any: '全部子类型', light_tank: '轻型坦克', medium_tank: '中型坦克', heavy_tank: '重型坦克', tank_destroyer: '坦克歼击车', spaa: '自行防空炮' },
  aircraft: { any: '全部子类型', fighter: '战斗机', attacker: '攻击机', bomber: '轰炸机' },
  helicopter: { any: '全部子类型', attack_helicopter: '攻击直升机', utility_helicopter: '通用直升机' },
  ship: { any: '全部子类型', fleet: '舰队', coastal: '沿海' },
};
export const SORT_OPTIONS: Record<string, string> = { newest: '最新', created: '发布时间', likes: '最多点赞', views: '最多浏览', downloads: '最多下载' };
export const PERIOD_OPTIONS: Record<string, number> = { '所有时间': 0, '最近7天': 7, '最近30天': 30, '最近90天': 90, '最近1年': 365 };
