import Swal from 'sweetalert2'

export const showSuccess = (title: string, message?: string) => {
  return Swal.fire({
    icon: 'success',
    title: title,
    text: message,
    background: '#111D33',
    color: '#ECF0FA',
    confirmButtonColor: '#00C6B8',
    confirmButtonText: 'Continue',
    timer: 3000,
    timerProgressBar: true,
    customClass: {
      popup: 'rounded-xl border border-[#1A2844]',
      confirmButton: 'px-6 py-2 rounded-lg font-semibold'
    }
  })
}

export const showError = (title: string, message?: string) => {
  return Swal.fire({
    icon: 'error',
    title: title,
    text: message,
    background: '#111D33',
    color: '#ECF0FA',
    confirmButtonColor: '#FF6B5B',
    confirmButtonText: 'Try Again',
    customClass: {
      popup: 'rounded-xl border border-[#1A2844]',
      confirmButton: 'px-6 py-2 rounded-lg font-semibold'
    }
  })
}

export const showWarning = (title: string, message?: string) => {
  return Swal.fire({
    icon: 'warning',
    title: title,
    text: message,
    background: '#111D33',
    color: '#ECF0FA',
    confirmButtonColor: '#FACC15',
    confirmButtonText: 'OK',
    customClass: {
      popup: 'rounded-xl border border-[#1A2844]',
      confirmButton: 'px-6 py-2 rounded-lg font-semibold'
    }
  })
}

export const showInfo = (title: string, message?: string) => {
  return Swal.fire({
    icon: 'info',
    title: title,
    text: message,
    background: '#111D33',
    color: '#ECF0FA',
    confirmButtonColor: '#4F8EFF',
    confirmButtonText: 'Got it',
    customClass: {
      popup: 'rounded-xl border border-[#1A2844]',
      confirmButton: 'px-6 py-2 rounded-lg font-semibold'
    }
  })
}

export const showConfirm = async (title: string, message?: string, confirmText?: string, cancelText?: string) => {
  const result = await Swal.fire({
    title: title,
    text: message,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#00C6B8',
    cancelButtonColor: '#5A6F99',
    confirmButtonText: confirmText || 'Yes',
    cancelButtonText: cancelText || 'Cancel',
    background: '#111D33',
    color: '#ECF0FA',
    customClass: {
      popup: 'rounded-xl border border-[#1A2844]',
      confirmButton: 'px-6 py-2 rounded-lg font-semibold',
      cancelButton: 'px-6 py-2 rounded-lg font-semibold'
    }
  })
  return result.isConfirmed
}

export const showLoading = (title: string = 'Please wait...') => {
  return Swal.fire({
    title: title,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading()
    },
    background: '#111D33',
    color: '#ECF0FA',
    customClass: {
      popup: 'rounded-xl border border-[#1A2844]'
    }
  })
}

export const closeLoading = () => {
  Swal.close()
}