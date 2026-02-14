/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./services/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                frost: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#009fe3', /* Brand Light Blue (F) */
                    600: '#0077c2',
                    700: '#002060', /* Brand Dark Blue (A) */
                    800: '#001a4d',
                    900: '#001033',
                }
            }
        },
    },
    plugins: [],
}
