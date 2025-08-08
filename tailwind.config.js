import typography from '@tailwindcss/typography';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,vue,svelte}'],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            // Base typography settings
            fontSize: '1.125rem', // 18px
            lineHeight: '1.8',
            color: '#d1d5db',
            
            // Heading sizes and styling
            'h1': { 
              fontSize: '2.5rem', 
              color: 'white',
              fontWeight: 'bold',
              marginTop: '2rem',
              marginBottom: '1.5rem',
              lineHeight: '1.3'
            },
            'h2': { 
              fontSize: '2rem',
              color: 'white',
              fontWeight: 'bold',
              marginTop: '3.5rem',
              marginBottom: '2rem',
              borderBottom: '3px solid #2847d7',
              paddingBottom: '0.75rem'
            },
            'h3': { 
              fontSize: '1.75rem',
              color: '#60a5fa',
              fontWeight: 'bold',
              marginTop: '2.5rem',
              marginBottom: '1.25rem'
            },
            'h4': {
              fontSize: '1.25rem',
              color: '#93c5fd',
              fontWeight: 'bold',
              marginTop: '2rem',
              marginBottom: '1rem'
            },
            'h5': {
              fontSize: '1.125rem',
              color: '#bfdbfe',
              fontWeight: 'bold',
              marginTop: '1.5rem',
              marginBottom: '0.75rem'
            },
            'h6': {
              fontSize: '1rem',
              color: '#dbeafe',
              fontWeight: 'bold',
              marginTop: '1.5rem',
              marginBottom: '0.75rem'
            },
            
            // Paragraph styling
            'p': { 
              marginBottom: '2rem',
              lineHeight: '1.9',
              fontSize: '1.125rem'
            },
            
            // Image styling with rounded corners
            'img': { 
              borderRadius: '1.5rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
              margin: '3rem 0',
              width: '100%',
              height: 'auto'
            },
            
            // Links
            'a': {
              color: '#2847d7',
              textDecoration: 'underline',
              fontWeight: '500',
              '&:hover': {
                color: '#3b82f6'
              }
            },
            
            // Lists
            'ul': {
              margin: '2rem 0',
              paddingLeft: '2rem'
            },
            'ol': {
              margin: '2rem 0',
              paddingLeft: '2rem'
            },
            'li': {
              marginBottom: '0.75rem',
              lineHeight: '1.8'
            },
            
            // Blockquotes
            'blockquote': {
              borderLeft: '4px solid #2847d7',
              paddingLeft: '2rem',
              fontStyle: 'italic',
              color: '#9ca3af',
              margin: '3rem 0',
              background: 'rgba(40, 71, 215, 0.05)',
              padding: '1.5rem 2rem',
              borderRadius: '0.75rem',
              fontSize: '1.125rem'
            },
            
            // Code blocks
            'code': {
              backgroundColor: '#1f2937',
              padding: '0.375rem 0.75rem',
              borderRadius: '0.5rem',
              fontSize: '0.9rem',
              color: '#d1d5db',
              border: '1px solid #374151'
            },
            'pre': {
              backgroundColor: '#111827',
              padding: '2rem',
              borderRadius: '1rem',
              margin: '3rem 0',
              border: '1px solid #374151'
            },
            'pre code': {
              backgroundColor: 'transparent',
              padding: '0',
              border: 'none',
              fontSize: '0.9rem'
            },
            
            // Tables
            'table': {
              width: '100%',
              borderCollapse: 'collapse',
              margin: '3rem 0',
              background: '#1f2937',
              borderRadius: '0.75rem',
              overflow: 'hidden',
              fontSize: '1rem'
            },
            'th': {
              padding: '1rem 1.25rem',
              border: '1px solid #374151',
              textAlign: 'left',
              background: '#374151',
              fontWeight: '600',
              color: 'white'
            },
            'td': {
              padding: '1rem 1.25rem',
              border: '1px solid #374151',
              textAlign: 'left',
              color: '#d1d5db'
            }
          },
        },
        invert: {
          css: {
            // Inherit all settings from DEFAULT for prose-invert
            color: '#d1d5db',
            'h1, h2, h3, h4, h5, h6': {
              color: 'white'
            },
            'a': {
              color: '#2847d7',
              '&:hover': {
                color: '#3b82f6'
              }
            },
            'blockquote': {
              color: '#9ca3af'
            },
            'code': {
              color: '#d1d5db'
            },
            'td': {
              color: '#d1d5db'
            }
          },
        },
      },
    },
  },
  plugins: [typography],
};