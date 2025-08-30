// 환경별 테이블명 설정
export const getTableNames = () => {
  const isProduction = process.env.NODE_ENV === 'production'
  const prefix = isProduction ? '' : 'dev_'
  
  return {
    comments: `${prefix}comments`,
    botPersonas: `${prefix}bot_personas`,
    adminUsers: `${prefix}admin_users`,
    scheduledJobs: `${prefix}scheduled_jobs`,
  }
}

// 현재 환경 정보
export const getEnvironmentInfo = () => ({
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  tablePrefix: process.env.NODE_ENV === 'production' ? '' : 'dev_',
})
