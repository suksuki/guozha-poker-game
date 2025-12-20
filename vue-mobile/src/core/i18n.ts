/**
 * i18n 适配器
 * 为 core 模块提供 i18n 访问
 */

import i18nInstance from '../i18n';

// 创建适配器对象，兼容旧的 i18next API
export const i18n = {
  get language() {
    return i18nInstance.global.locale.value;
  },
  t(key: string, options?: any) {
    return i18nInstance.global.t(key, options);
  }
};

