export interface MessageInterface {
    id: number
    content: string
    createdAt: string
    userId: number
    chatId: number
    userName?: string;
    isWriter: boolean
}
