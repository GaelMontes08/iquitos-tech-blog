# 🌟 Iquitos Tech

A modern, dark-themed technology and gaming news website built with **Astro 5** and **TailwindCSS**, featuring WordPress headless CMS integration and real-time view tracking with Supabase.

![Iquitos Tech](https://github.com/GaelMontes08/iquitos-tech-blog/blob/master/public/logo.svg)

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
- **Rich Content**: Support for images, videos, code blocks, tables
- **FAQ Accordion**: Interactive Q&A sections with smooth animations
- **Related Posts**: Automatically generated based on categories

### 🎨 **Styling & Design**
- **Tailwind Typography**: Beautiful content formatting
- **Custom Components**: Header, Footer, PostCard, NewsItem
- **Interactive Elements**: Hover effects, transitions, animations
- **Content Transformation**: WordPress HTML cleaned and styled with Tailwind

### 📊 **Analytics & Tracking**
- **Supabase Integration**: Real-time view counting
- **RPC Functions**: `increment_post_views` for accurate tracking
- **Trending Algorithm**: Most viewed posts calculation
- **Performance Monitoring**: View analytics and user engagement

### 🔧 **Technical Features**
- **TypeScript**: Full type safety throughout the project
- **Content Sections**: Automatic parsing of "Puntos clave" and FAQ sections
- **Image Optimization**: Responsive images with proper lazy loading
- **Error Handling**: Custom 404 page and error boundaries
- **Build Optimization**: Static site generation with dynamic content

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**
- **WordPress** site with REST API enabled
- **Supabase** account for view tracking

### 📥 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/GaelMontes08/iquitos-tech-blog.git
   cd iquitos-tech-blog
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```bash
   # WordPress Configuration
   WP_DOMAIN=your-wordpress-site.com
   WP_API_URL=https://your-wordpress-site.com/wp-json/wp/v2

   # Supabase Configuration
   SUPABASE_URL=your-supabase-url
   SUPABASE_ANON_KEY=your-supabase-anon-key

   # Optional: Site Configuration
   SITE_URL=https://your-domain.com
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   Visit `http://localhost:4321` to see your site in action! 🎉

## � Project Structure

```
iquitos-tech/
├── 📂 public/                  # Static assets
│   ├── 🖼️ logo.svg            # Site logo
│   ├── 🖼️ author.jpg          # Default author image
│   ├── 🖼️ favicon.svg         # Site favicon
│   └── 📂 img/                # Post images
├── 📂 src/
│   ├── 📂 assets/             # Build-time assets
│   ├── 📂 components/         # Reusable components
│   │   ├── 🧩 Header.astro    # Navigation header
│   │   ├── 🧩 Footer.astro    # Site footer
│   │   ├── 🧩 PostCard.astro  # Post preview card
│   │   ├── 🧩 NewsItem.astro  # News item component
│   │   └── 🧩 Logo.astro      # Site logo component
│   ├── 📂 layouts/            # Page layouts
│   │   └── 🎯 Layout.astro    # Main layout template
│   ├── 📂 lib/                # Utility libraries
│   │   ├── 🔧 wp.ts           # WordPress API integration
│   │   ├── 🔧 supabase.ts     # Supabase client
│   │   ├── 🔧 views.ts        # View tracking logic
│   │   └── 🔧 content-transformer.ts # WordPress content processing
│   ├── 📂 pages/              # File-based routing
│   │   ├── 🏠 index.astro     # Homepage
│   │   ├── 📄 posts.astro     # All posts page
│   │   ├── 📂 posts/          # Dynamic post routes
│   │   │   └── 📄 [slug].astro # Individual post pages
│   │   ├── 📂 categoria/      # Category routes
│   │   │   └── 📄 [slug].astro # Category pages
│   │   └── 📂 api/            # API endpoints
│   │       └── 🔌 increment-view.ts # View tracking endpoint
│   ├── 📂 sections/           # Page sections
│   │   └── 🎯 Trends.astro    # Trending posts section
│   └── 📂 styles/             # Global styles
│       └── 🎨 global.css      # Global CSS
├── ⚙️ astro.config.mjs        # Astro configuration
├── ⚙️ tailwind.config.js      # Tailwind configuration
├── ⚙️ tsconfig.json          # TypeScript configuration
└── 📋 package.json           # Project dependencies
```

## 🔧 Configuration

### WordPress Setup

1. **Enable REST API** (usually enabled by default)
2. **Install required plugins**:
   - Yoast SEO (for SEO metadata)
   - Featured images support
3. **Content Structure**:
   - Create categories: Gaming, Tech, Mobile, AI
   - Add featured images to posts
   - Use "Puntos clave" and "Preguntas frecuentes" sections

### Supabase Setup

1. **Create a new project** in Supabase
2. **Create the views table**:
   ```sql
   CREATE TABLE post_views (
     id SERIAL PRIMARY KEY,
     post_id INTEGER UNIQUE NOT NULL,
     view_count INTEGER DEFAULT 0,
     last_updated TIMESTAMP DEFAULT NOW()
   );
   ```

3. **Create the RPC function**:
   ```sql
   CREATE OR REPLACE FUNCTION increment_post_views(post_id_param INTEGER)
   RETURNS INTEGER AS $$
   DECLARE
     new_count INTEGER;
   BEGIN
     INSERT INTO post_views (post_id, view_count)
     VALUES (post_id_param, 1)
     ON CONFLICT (post_id)
     DO UPDATE SET
       view_count = post_views.view_count + 1,
       last_updated = NOW()
     RETURNING view_count INTO new_count;
     
     RETURN new_count;
   END;
   $$ LANGUAGE plpgsql;
   ```

### Tailwind Configuration

The project uses a custom Tailwind setup with:
- **Path alias**: `@` points to `./src`
- **Typography plugin**: For beautiful content formatting
- **Custom colors**: Blue accent theme (`#2847d7`)
- **Dark theme**: Optimized for dark backgrounds

## 🛠️ Development

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

## 🧞 Commands

| Command | Action |
|---------|--------|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server at `localhost:4321` |
| `npm run build` | Build production site to `./dist/` |
| `npm run preview` | Preview build locally |
| `npm run astro check` | Run Astro diagnostics |
| `npm run astro sync` | Sync types |

## 🚀 Build & Deploy

### Production Build

```bash
npm run build
```

The build creates optimized static files in the `dist/` directory.

### Vercel Deployment

This project is configured for **automatic deployment** on Vercel:

1. **Connect repository** to Vercel
2. **Add environment variables** in Vercel dashboard
3. **Push to main branch** - automatic deployment triggers
4. **Custom domain**: Configure in Vercel settings

### Environment Variables for Production

```bash
WP_DOMAIN=your-production-wordpress-site.com
SUPABASE_URL=your-production-supabase-url
SUPABASE_ANON_KEY=your-production-supabase-key
SITE_URL=https://your-production-domain.com
```

## 🎨 Design System

### Color Palette
- **Primary**: `#2847d7` (Blue)
- **Background**: `#0a0a0a` (Dark)
- **Surface**: `#1a1a1a` (Dark Gray)
- **Text**: `#ffffff` (White)
- **Muted**: `#9ca3af` (Gray)

### Typography
- **Headings**: Bold, hierarchical sizing
- **Body**: Readable line height, proper spacing
- **Code**: Monospace with syntax highlighting
- **Links**: Blue with hover effects

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

### Commit Convention

```
feat: add new homepage hero section
fix: resolve mobile navigation issue
docs: update README installation steps
style: improve button hover animations
refactor: optimize WordPress API calls
```

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[Astro](https://astro.build/)** - The web framework for content-driven websites
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[WordPress](https://wordpress.org/)** - Content management system
- **[Supabase](https://supabase.com/)** - Open source Firebase alternative
- **[Vercel](https://vercel.com/)** - Deployment and hosting platform

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/GaelMontes08/iquitos-tech-blog/issues)
- **Documentation**: [Astro Docs](https://docs.astro.build/)
- **Community**: [Astro Discord](https://astro.build/chat)

---

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

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
