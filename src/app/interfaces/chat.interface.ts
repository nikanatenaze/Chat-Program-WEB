export interface ChatInterface {
    id: number
    name: string
    hasPassword: boolean
    password: string
    chatImageUrl?: string
    createdAt: string
    createdByUserId: number
}
