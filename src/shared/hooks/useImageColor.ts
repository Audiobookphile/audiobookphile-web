import { useEffect, useState } from 'react'

export function useImageColor(src?: string | null) {
  const [color, setColor] = useState<string | null>(null)

  useEffect(() => {
    if (!src) {
      setColor(null)
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = src

    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      // Sample a few key points (e.g. center or average)
      // For simplicity, get the average color of the image, sampling every 10th pixel for performance
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        let r = 0,
          g = 0,
          b = 0
        let count = 0

        for (let i = 0; i < data.length; i += 40) {
          // step by 10 pixels (40 values)
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
          count++
        }

        r = Math.floor(r / count)
        g = Math.floor(g / count)
        b = Math.floor(b / count)

        setColor(`rgb(${r}, ${g}, ${b})`)
      } catch (e) {
        console.warn('Could not extract image color due to CORS or canvas error:', e)
        setColor(null)
      }
    }
  }, [src])

  return color
}
