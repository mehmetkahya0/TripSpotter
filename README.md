# 🗺️ TripSpotter

**Discover Amazing Places Around You**

TripSpotter is a beautiful, interactive travel planner web application that helps travelers discover interesting places, landmarks, and attractions anywhere in the world. Simply click on the map to explore nearby points of interest!

![TripSpotter](https://img.shields.io/badge/TripSpotter-Travel%20Planner-38bdf8?style=for-the-badge)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)

## ✨ Features

### 🔍 Explore Places
- **Click-to-Discover**: Click anywhere on the map to find nearby attractions
- **Adjustable Search Radius**: Control the search area from 500m to 5km
- **Rich POI Data**: Discover restaurants, hotels, historic sites, nature spots, and more
- **Real-time Results**: Powered by OpenStreetMap's Overpass API (free, no API key needed)

### 📍 Place Categories
- 🍽️ **Restaurants** - Cafes, bars, and dining spots
- 🏨 **Hotels** - Accommodation options
- 🏛️ **Attractions** - Museums, monuments, historic sites, churches, mosques
- 🌳 **Nature** - Parks, gardens, viewpoints
- 🛍️ **Shopping** - Markets, malls, local shops

### 🧳 Trip Planning
- Create and manage multiple trips
- Add discovered places to your trips
- Organize trip itineraries
- Set trip dates and custom icons
- View trip locations on the map

### ❤️ Favorites
- Save your favorite places
- Quick access to saved locations
- View all favorites on the map

### 🎨 Beautiful UI
- Soft, pastel color palette
- Smooth animations and transitions
- Dark/Light theme toggle
- Fully responsive design
- Cute, user-friendly interface

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- No server required - runs entirely in the browser!

### Installation

1. **Clone or download** this repository:
   ```bash
   git clone https://github.com/yourusername/tripspotter.git
   ```

2. **Open** `index.html` in your browser:
   ```bash
   # Windows
   explorer index.html
   
   # macOS
   open index.html
   
   # Linux
   xdg-open index.html
   ```

3. **Start exploring!** Click anywhere on the map to discover places.

## 📁 Project Structure

```
TripSpotter/
├── index.html      # Main HTML structure
├── styles.css      # All styling (1800+ lines of beautiful CSS)
├── app.js          # Application logic (1400+ lines)
└── README.md       # This file
```

## 🛠️ Technologies Used

| Technology | Purpose |
|------------|---------|
| **HTML5** | Structure and semantics |
| **CSS3** | Styling, animations, responsive design |
| **JavaScript (ES6+)** | Application logic |
| **Leaflet.js** | Interactive map library |
| **Overpass API** | OpenStreetMap POI data |
| **CARTO Tiles** | Beautiful map styling |
| **Font Awesome** | Icons |
| **Google Fonts** | Poppins & Caveat fonts |
| **LocalStorage** | Data persistence |

## 🎯 How to Use

1. **Explore Tab**
   - Click anywhere on the map
   - Adjust the search radius with the slider
   - Browse discovered places in the sidebar
   - Click on markers for details

2. **Add to Trip**
   - Click the "+" button on any place
   - Select an existing trip or create a new one
   - View your trips in the right panel

3. **Favorites**
   - Click the ❤️ heart icon to save places
   - Access favorites from the navigation menu
   - View all favorites on the map

4. **Theme Toggle**
   - Click the 🌙/☀️ icon in the header
   - Switch between light and dark themes

## 🌐 API Information

TripSpotter uses the **Overpass API** to fetch place data from OpenStreetMap.

- **Free to use** - No API key required
- **Multiple endpoints** for reliability:
  - `overpass-api.de`
  - `overpass.kumi.systems`
  - `maps.mail.ru`
- **Fallback system** - Automatically tries alternate servers if one fails

## 📱 Responsive Design

TripSpotter works great on:
- 🖥️ Desktop computers
- 💻 Laptops
- 📱 Tablets
- 📱 Mobile phones

## 🎨 Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Blue | `#0ea5e9` | Main actions, links |
| Coral | `#ff7f7f` | Restaurants |
| Mint | `#4ecdc4` | Hotels |
| Purple | `#a55eea` | Attractions |
| Green | `#51cf66` | Nature |
| Yellow | `#feca57` | Shopping |

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [OpenStreetMap](https://www.openstreetmap.org/) - Map data
- [Leaflet](https://leafletjs.com/) - Map library
- [CARTO](https://carto.com/) - Map tiles
- [Font Awesome](https://fontawesome.com/) - Icons
- [Google Fonts](https://fonts.google.com/) - Typography

---

<p align="center">
  Mehmet Kahya
  <br>
  <strong>TripSpotter</strong> - Discover Amazing Places
</p>
