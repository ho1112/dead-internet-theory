export interface Comment {
  id: string
  content: string
  author_name: string
  author_avatar: string
  is_bot: boolean
  parent_id: string | null
  created_at: string
  post_id: string
}





export interface AdminUser {
  id: string
  email: string
  password_hash: string
  created_at: string
}
