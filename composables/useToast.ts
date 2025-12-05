export interface ToastNotification {
  id: number
  title: string
  description?: string
  color?: 'success' | 'error' | 'info' | 'warning'
}

const notifications = ref<ToastNotification[]>([])
let idCounter = 0

export const useToast = () => {
  const add = (notification: Omit<ToastNotification, 'id'>) => {
    const id = idCounter++
    notifications.value.push({ ...notification, id })
    setTimeout(() => {
      remove(id)
    }, 4000)
  }

  const remove = (id: number) => {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }

  return {
    add,
    notifications,
    remove
  }
}
