export type ServerActionResponse<T = undefined> = {
  success: boolean
  data?: T
  error?: string
}
