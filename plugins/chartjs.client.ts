import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement
} from 'chart.js'

export default defineNuxtPlugin(() => {
  ChartJS.register(
    Title,
    Tooltip,
    Legend,
    BarElement,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement
  )

  // Couleurs des textes et de la grille selon le thème clair / sombre. Les
  // graphiques sont redessinés à chaque bascule (`:key` sur $colorMode.value).
  const colorMode = useColorMode()
  watch(
    () => colorMode.value,
    mode => {
      const dark = mode === 'dark'
      ChartJS.defaults.color = dark ? '#a1a1aa' : '#52525b'
      ChartJS.defaults.borderColor = dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
    },
    { immediate: true }
  )
})
