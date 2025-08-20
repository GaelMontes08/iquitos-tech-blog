# 🌟 Iquitos Tech

A modern, dark-themed technology and gaming news website built with **Astro 5** and **TailwindCSS**, featuring WordPress headless CMS integration and real-time view tracking with Supabase.

## 📖 Overview

Iquitos Tech is a high-performance news platform focused on technology, gaming, mobile devices, and AI content. Built with modern web technologies for optimal performance and SEO, featuring a sleek dark theme and responsive design.

### 🎯 Key Highlights

- ⚡ **Lightning Fast**: Built with Astro for optimal performance and SEO
- 🎨 **Dark Theme**: Modern, eye-friendly design with blue accent colors
- 📱 **Fully Responsive**: Optimized for desktop, tablet, and mobile devices
- 🔍 **SEO Optimized**: Meta tags, Open Graph, and Twitter Cards
- 📊 **Real-time Analytics**: View tracking with Supabase integration
- 🎮 **Gaming Focus**: Dedicated sections for gaming, tech, and mobile news

## ✨ Features

### 🏠 **Homepage**
- Hero section with featured posts
- Latest news grid with category filtering
- Trending posts sidebar with view counts
- Crypto ticker integration
- Bento grid layout for visual appeal

### 📝 **Content Management**
- **WordPress Headless CMS**: Content managed through WordPress REST API
- **Dynamic Routes**: `/posts/[slug]` and `/categoria/[slug]`
- **Categories Page**: `/categorias` - Complete directory of all content categories
- **Rich Content**: Support for images, videos, code blocks, tables
- **FAQ Accordion**: Interactive Q&A sections with smooth animations
- **Related Posts**: Automatically generated based on categories

### 🔧 **Technical Features**
- **TypeScript**: Full type safety throughout the project
- **Content Sections**: Automatic parsing of "Puntos clave" and FAQ sections
- **Image Optimization**: Responsive images with proper lazy loading
- **Error Handling**: Custom 404 page and error boundaries
- **Build Optimization**: Static site generation with dynamic content

### 📝 Adding New Posts

1. **WordPress Dashboard**: Create posts with proper categories
2. **Content Structure**: Use H2 headings for "Puntos clave" and "Preguntas frecuentes"
3. **Featured Images**: Always include a featured image
4. **SEO**: Fill in meta descriptions and Yoast SEO fields

### 🎨 Customizing Styles

- **Colors**: Edit `tailwind.config.js` for theme colors
- **Typography**: Modify Typography plugin settings for content styling
- **Components**: Update component files in `src/components/`

### 📊 View Tracking

The view tracking system works automatically:
1. User visits a post page
2. Client-side JavaScript calls `/api/increment-view`
3. API calls Supabase RPC function
4. View count is incremented and cached

### Vercel Deployment

This project is configured for **automatic deployment** on Vercel:

1. **Connect repository** to Vercel
2. **Add environment variables** in Vercel dashboard
3. **Push to main branch** - automatic deployment triggers
4. **Custom domain**: Configure in Vercel settings

## 🎨 Design System

### Color Palette
- **Primary**: `#2847d7` (Blue)
- **Background**: `#0a0a0a` (Dark)
- **Surface**: `#1a1a1a` (Dark Gray)
- **Text**: `#ffffff` (White)
- **Muted**: `#9ca3af` (Gray)

### Components
- **Cards**: Rounded corners, hover effects
- **Buttons**: Gradient backgrounds, transitions
- **Forms**: Clean inputs with focus states
- **Navigation**: Responsive with mobile menu

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Test thoroughly**: `npm run build` and `npm run preview`
5. **Commit changes**: Use conventional commit messages
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Code Style

- **TypeScript**: Use proper types and interfaces
- **Components**: Follow Astro component patterns
- **CSS**: Use Tailwind classes, avoid custom CSS when possible
- **Formatting**: Use Prettier for consistent formatting

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[Astro](https://astro.build/)** - The web framework for content-driven websites
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[WordPress](https://wordpress.org/)** - Content management system
- **[Supabase](https://supabase.com/)** - Open source Firebase alternative
- **[Vercel](https://vercel.com/)** - Deployment and hosting platform
- 
<div align="center">
  <strong>Built with ❤️ by the Iquitos Tech team</strong>
  <br>
  <sub>Powered by Astro • TailwindCSS • WordPress • Supabase</sub>
</div>
```

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```
