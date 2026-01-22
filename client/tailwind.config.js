/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                nature: {
                    50: '#f2fcf5',
                    100: '#e1f8e8',
                    200: '#c3efd2',
                    300: '#95e1b4',
                    400: '#5ecd92',
                    500: '#34b376',
                    600: '#25925e',
                    700: '#20754e',
                    800: '#1e5d40', // KKM Primary
                    900: '#1a4c36',
                    950: '#0d2b1f',
                },
                earth: {
                    50: '#f9f8f6',
                    100: '#efece7',
                    200: '#ded7ce',
                    300: '#c6bbaa',
                    400: '#ad9c86',
                    500: '#94806a',
                    600: '#7a6654',
                    700: '#635346',
                    800: '#53463d',
                    900: '#463b36',
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
