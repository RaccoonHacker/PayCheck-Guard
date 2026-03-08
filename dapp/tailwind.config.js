/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // 核心：确保扫描 src 目录下的所有相关文件
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    // 兼容性：保留根目录扫描（防止你后续移动文件）
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // 你可以在这里添加自定义的科技感颜色，例如：
      colors: {
        'eth-blue': '#3b82f6',
        'eth-purple': '#a855f7',
      }
    },
  },
  plugins: [],
}