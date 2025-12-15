import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
    	container: {
    		center: true,
    		padding: '2rem',
    		screens: {
    			'2xl': '1400px'
    		}
    	},
    	extend: {
    		fontFamily: {
    			sans: [
    				'DM Sans',
    				'ui-sans-serif',
    				'system-ui',
    				'-apple-system',
    				'BlinkMacSystemFont',
    				'Segoe UI',
    				'Roboto',
    				'Helvetica Neue',
    				'Arial',
    				'Noto Sans',
    				'sans-serif'
    			],
    			serif: [
    				'Crimson Pro',
    				'ui-serif',
    				'Georgia',
    				'Cambria',
    				'Times New Roman',
    				'Times',
    				'serif'
    			],
    			mono: [
    				'SF Mono',
    				'ui-monospace',
    				'SFMono-Regular',
    				'Menlo',
    				'Monaco',
    				'Consolas',
    				'Liberation Mono',
    				'Courier New',
    				'monospace'
    			]
    		},
    		colors: {
    			border: 'hsl(var(--border))',
    			input: 'hsl(var(--input))',
    			ring: 'hsl(var(--ring))',
    			background: 'hsl(var(--background))',
    			foreground: 'hsl(var(--foreground))',
    			primary: {
    				DEFAULT: 'hsl(var(--primary))',
    				light: 'hsl(var(--primary-light))',
    				dark: 'hsl(var(--primary-dark))',
    				foreground: 'hsl(var(--primary-foreground))'
    			},
    			secondary: {
    				DEFAULT: 'hsl(var(--secondary))',
    				light: 'hsl(var(--secondary-light))',
    				foreground: 'hsl(var(--secondary-foreground))'
    			},
    			destructive: {
    				DEFAULT: 'hsl(var(--destructive))',
    				foreground: 'hsl(var(--destructive-foreground))'
    			},
    			success: {
    				DEFAULT: 'hsl(var(--success))',
    				foreground: 'hsl(var(--success-foreground))'
    			},
    			info: {
    				DEFAULT: 'hsl(var(--info))',
    				foreground: 'hsl(var(--info-foreground))'
    			},
    			warning: {
    				DEFAULT: 'hsl(var(--warning))',
    				foreground: 'hsl(var(--warning-foreground))'
    			},
    			muted: {
    				DEFAULT: 'hsl(var(--muted))',
    				foreground: 'hsl(var(--muted-foreground))'
    			},
    			accent: {
    				DEFAULT: 'hsl(var(--accent))',
    				foreground: 'hsl(var(--accent-foreground))'
    			},
    			popover: {
    				DEFAULT: 'hsl(var(--popover))',
    				foreground: 'hsl(var(--popover-foreground))'
    			},
    			card: {
    				DEFAULT: 'hsl(var(--card))',
    				foreground: 'hsl(var(--card-foreground))'
    			},
    			skill: {
    				high: 'hsl(var(--skill-high))',
    				medium: 'hsl(var(--skill-medium))',
    				low: 'hsl(var(--skill-low))'
    			},
    			text: {
    				primary: 'hsl(var(--text-primary))',
    				secondary: 'hsl(var(--text-secondary))'
    			},
    			sidebar: {
    				DEFAULT: 'hsl(var(--sidebar-background))',
    				foreground: 'hsl(var(--sidebar-foreground))',
    				primary: 'hsl(var(--sidebar-primary))',
    				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
    				accent: 'hsl(var(--sidebar-accent))',
    				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
    				border: 'hsl(var(--sidebar-border))',
    				ring: 'hsl(var(--sidebar-ring))'
    			},
    			chart: {
    				'1': 'hsl(var(--chart-1))',
    				'2': 'hsl(var(--chart-2))',
    				'3': 'hsl(var(--chart-3))',
    				'4': 'hsl(var(--chart-4))',
    				'5': 'hsl(var(--chart-5))'
    			}
    		},
    		borderRadius: {
    			lg: 'var(--radius)',
    			md: 'calc(var(--radius) - 2px)',
    			sm: 'calc(var(--radius) - 4px)'
    		},
    		keyframes: {
    			'accordion-down': {
    				from: {
    					height: '0',
    					opacity: '0'
    				},
    				to: {
    					height: 'var(--radix-accordion-content-height)',
    					opacity: '1'
    				}
    			},
    			'accordion-up': {
    				from: {
    					height: 'var(--radix-accordion-content-height)',
    					opacity: '1'
    				},
    				to: {
    					height: '0',
    					opacity: '0'
    				}
    			},
    			'fade-in': {
    				'0%': {
    					opacity: '0',
    					transform: 'translateY(4px)'
    				},
    				'100%': {
    					opacity: '1',
    					transform: 'translateY(0)'
    				}
    			},
    			'fade-out': {
    				'0%': {
    					opacity: '1',
    					transform: 'translateY(0)'
    				},
    				'100%': {
    					opacity: '0',
    					transform: 'translateY(4px)'
    				}
    			},
    			'scale-in': {
    				'0%': {
    					transform: 'scale(0.96)',
    					opacity: '0'
    				},
    				'100%': {
    					transform: 'scale(1)',
    					opacity: '1'
    				}
    			},
    			'scale-out': {
    				'0%': {
    					transform: 'scale(1)',
    					opacity: '1'
    				},
    				'100%': {
    					transform: 'scale(0.96)',
    					opacity: '0'
    				}
    			},
    			'slide-in-right': {
    				'0%': {
    					transform: 'translateX(100%)'
    				},
    				'100%': {
    					transform: 'translateX(0)'
    				}
    			},
    			'slide-out-right': {
    				'0%': {
    					transform: 'translateX(0)'
    				},
    				'100%': {
    					transform: 'translateX(100%)'
    				}
    			},
    			'slide-in-left': {
    				'0%': {
    					transform: 'translateX(-100%)'
    				},
    				'100%': {
    					transform: 'translateX(0)'
    				}
    			},
    			'slide-out-left': {
    				'0%': {
    					transform: 'translateX(0)'
    				},
    				'100%': {
    					transform: 'translateX(-100%)'
    				}
    			},
    			'slide-down': {
    				'0%': {
    					transform: 'translateY(-8px)',
    					opacity: '0'
    				},
    				'100%': {
    					transform: 'translateY(0)',
    					opacity: '1'
    				}
    			},
    			'slide-up': {
    				'0%': {
    					transform: 'translateY(0)',
    					opacity: '1'
    				},
    				'100%': {
    					transform: 'translateY(-8px)',
    					opacity: '0'
    				}
    			},
    			shimmer: {
    				'0%': {
    					backgroundPosition: '-1000px 0'
    				},
    				'100%': {
    					backgroundPosition: '1000px 0'
    				}
    			}
    		},
    		animation: {
    			'accordion-down': 'accordion-down 0.25s ease-in-out',
    			'accordion-up': 'accordion-up 0.25s ease-in-out',
    			'fade-in': 'fade-in 0.25s ease-in-out',
    			'fade-out': 'fade-out 0.25s ease-in-out',
    			'scale-in': 'scale-in 0.2s ease-in-out',
    			'scale-out': 'scale-out 0.2s ease-in-out',
    			'slide-in-right': 'slide-in-right 0.25s ease-in-out',
    			'slide-out-right': 'slide-out-right 0.25s ease-in-out',
    			'slide-in-left': 'slide-in-left 0.25s ease-in-out',
    			'slide-out-left': 'slide-out-left 0.25s ease-in-out',
    			'slide-down': 'slide-down 0.2s ease-in-out',
    			'slide-up': 'slide-up 0.2s ease-in-out',
    			shimmer: 'shimmer 2s linear infinite'
    		},
    		transitionTimingFunction: {
    			smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    			'bounce-subtle': 'cubic-bezier(0.34, 1.56, 0.64, 1)'
    		},
    		transitionDuration: {
    			'250': '250ms'
    		},
    		boxShadow: {
    			'2xs': 'var(--shadow-2xs)',
    			xs: 'var(--shadow-xs)',
    			sm: 'var(--shadow-sm)',
    			md: 'var(--shadow-md)',
    			lg: 'var(--shadow-lg)',
    			xl: 'var(--shadow-xl)',
    			'2xl': 'var(--shadow-2xl)'
    		}
    	}
    },
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
