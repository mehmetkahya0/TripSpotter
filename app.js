/**
 * TripSpotter - Discover Amazing Places
 * Main Application JavaScript
 */

// ========================================
// Application State
// ========================================
const AppState = {
    map: null,
    markers: [],
    nearbyPlaces: [],
    trips: [],
    favorites: [],
    favoritePlaces: [], // Store full favorite place data
    selectedPlace: null,
    selectedTrip: null,
    currentCategory: 'all',
    currentSection: 'explore', // explore, trips, favorites
    isDarkTheme: false,
    isLoading: false,
    searchCircle: null,
    searchRadius: 1500 // Default 1.5km for better results
};

// ========================================
// Initialize Application
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    initializeEventListeners();
    loadFromLocalStorage();
    updateStats();
    renderTrips();
});

// ========================================
// Map Initialization
// ========================================
function initializeMap() {
    // Initialize Leaflet map
    AppState.map = L.map('map', {
        center: [41.0082, 28.9784], // Istanbul as default
        zoom: 14,
        zoomControl: false,
        attributionControl: true
    });

    // Add beautiful tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(AppState.map);

    // Click on map to search nearby places
    AppState.map.on('click', onMapClick);
}

async function onMapClick(e) {
    const { lat, lng } = e.latlng;
    
    // Clear previous markers and circle
    clearNearbyMarkers();
    
    // Show search area with current radius
    if (AppState.searchCircle) {
        AppState.map.removeLayer(AppState.searchCircle);
    }
    
    AppState.searchCircle = L.circle([lat, lng], {
        color: '#0ea5e9',
        fillColor: '#38bdf8',
        fillOpacity: 0.1,
        radius: AppState.searchRadius,
        weight: 2,
        dashArray: '5, 10'
    }).addTo(AppState.map);

    // Fetch nearby places
    const radiusText = AppState.searchRadius >= 1000 
        ? `${AppState.searchRadius / 1000} km` 
        : `${AppState.searchRadius}m`;
    showToast(`Searching places within ${radiusText}...`, 'info');
    await fetchNearbyPlaces(lat, lng, AppState.searchRadius);
}

// ========================================
// Overpass API - Fetch Nearby Places (Free, No API Key)
// ========================================
async function fetchNearbyPlaces(lat, lng, radius = 1500) {
    if (AppState.isLoading) return;
    
    AppState.isLoading = true;
    showLoadingState(true);

    // Comprehensive Overpass API query for various POIs
    // This query gets restaurants, cafes, bars, hotels, attractions, museums,
    // historic places, monuments, parks, shopping, and more
    const query = `
        [out:json][timeout:45];
        (
            // Food & Drinks
            node["amenity"~"restaurant|cafe|fast_food|bar|pub|food_court|ice_cream|biergarten"](around:${radius},${lat},${lng});
            way["amenity"~"restaurant|cafe|bar"](around:${radius},${lat},${lng});
            
            // Accommodation
            node["tourism"~"hotel|hostel|guest_house|motel|apartment|chalet"](around:${radius},${lat},${lng});
            way["tourism"~"hotel|hostel|guest_house|motel"](around:${radius},${lat},${lng});
            
            // Tourist Attractions
            node["tourism"~"attraction|museum|gallery|viewpoint|artwork|zoo|aquarium|theme_park|information"](around:${radius},${lat},${lng});
            way["tourism"~"attraction|museum|gallery|zoo|aquarium|theme_park"](around:${radius},${lat},${lng});
            relation["tourism"~"attraction|museum"](around:${radius},${lat},${lng});
            
            // Historic Places (EXPANDED)
            node["historic"](around:${radius},${lat},${lng});
            way["historic"](around:${radius},${lat},${lng});
            relation["historic"](around:${radius},${lat},${lng});
            node["heritage"](around:${radius},${lat},${lng});
            way["heritage"](around:${radius},${lat},${lng});
            node["building"="church"](around:${radius},${lat},${lng});
            node["building"="cathedral"](around:${radius},${lat},${lng});
            node["building"="mosque"](around:${radius},${lat},${lng});
            node["building"="synagogue"](around:${radius},${lat},${lng});
            node["building"="temple"](around:${radius},${lat},${lng});
            way["building"~"church|cathedral|mosque|synagogue|temple"](around:${radius},${lat},${lng});
            node["amenity"~"place_of_worship"](around:${radius},${lat},${lng});
            way["amenity"="place_of_worship"](around:${radius},${lat},${lng});
            
            // Monuments & Memorials
            node["memorial"](around:${radius},${lat},${lng});
            node["man_made"~"tower|lighthouse|windmill"](around:${radius},${lat},${lng});
            way["man_made"~"tower|lighthouse"](around:${radius},${lat},${lng});
            
            // Entertainment & Culture
            node["amenity"~"theatre|cinema|nightclub|casino|arts_centre|community_centre"](around:${radius},${lat},${lng});
            way["amenity"~"theatre|cinema|arts_centre"](around:${radius},${lat},${lng});
            
            // Nature & Parks
            node["leisure"~"park|garden|nature_reserve|playground|beach_resort|marina"](around:${radius},${lat},${lng});
            way["leisure"~"park|garden|nature_reserve|marina"](around:${radius},${lat},${lng});
            node["natural"~"beach|peak|waterfall|cave_entrance|spring|hot_spring"](around:${radius},${lat},${lng});
            way["natural"~"beach|wood"](around:${radius},${lat},${lng});
            node["tourism"="picnic_site"](around:${radius},${lat},${lng});
            
            // Shopping
            node["shop"~"mall|department_store|supermarket|clothes|gift|jewelry|antiques|art"](around:${radius},${lat},${lng});
            way["shop"~"mall|department_store"](around:${radius},${lat},${lng});
            node["amenity"="marketplace"](around:${radius},${lat},${lng});
            way["amenity"="marketplace"](around:${radius},${lat},${lng});
        );
        out center 100;
    `;

    // Try multiple Overpass API endpoints (all free, no API key needed)
    const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
    ];

    let success = false;
    
    for (const endpoint of endpoints) {
        if (success) break;
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            
            const response = await fetch(endpoint, {
                method: 'POST',
                body: `data=${encodeURIComponent(query)}`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                if (data.elements && data.elements.length > 0) {
                    processPlacesData(data.elements, lat, lng);
                    success = true;
                } else {
                    // No places found - show message
                    showToast('No places found in this area. Try a larger radius!', 'info');
                    success = true;
                }
            }
        } catch (error) {
            console.log(`Endpoint ${endpoint} failed, trying next...`);
        }
    }

    if (!success) {
        console.error('All API endpoints failed');
        showToast('Using sample data (API temporarily unavailable)', 'info');
        showDemoPlaces(lat, lng, radius);
    }

    AppState.isLoading = false;
    showLoadingState(false);
}

function processPlacesData(elements, centerLat, centerLng) {
    AppState.nearbyPlaces = [];
    const seenNames = new Set(); // Avoid duplicates
    
    elements.forEach(element => {
        const lat = element.lat || element.center?.lat;
        const lng = element.lon || element.center?.lon;
        
        if (!lat || !lng) return;
        
        const tags = element.tags || {};
        const name = tags.name || tags['name:en'] || tags['name:tr'];
        
        if (!name) return; // Skip unnamed places
        
        // Skip duplicates based on name
        const nameKey = name.toLowerCase().trim();
        if (seenNames.has(nameKey)) return;
        seenNames.add(nameKey);
        
        const category = determineCategory(tags);
        const place = {
            id: `osm_${element.id}_${element.type || 'node'}`,
            osmId: element.id,
            name: name,
            category: category,
            description: generateDescription(tags),
            lat: lat,
            lng: lng,
            tags: tags,
            distance: calculateDistance(centerLat, centerLng, lat, lng)
        };
        
        AppState.nearbyPlaces.push(place);
    });

    // Sort by distance
    AppState.nearbyPlaces.sort((a, b) => a.distance - b.distance);
    
    // Limit to 50 places for better coverage
    AppState.nearbyPlaces = AppState.nearbyPlaces.slice(0, 50);

    // Display markers and update sidebar
    displayNearbyPlaces();
    
    const count = AppState.nearbyPlaces.length;
    if (count > 0) {
        showToast(`Found ${count} places nearby!`, 'success');
    } else {
        showToast('No places found. Try another area.', 'info');
    }
}

function determineCategory(tags) {
    // Restaurant/Food
    if (tags.amenity === 'restaurant' || tags.amenity === 'cafe' || 
        tags.amenity === 'fast_food' || tags.amenity === 'bar' ||
        tags.amenity === 'pub' || tags.amenity === 'food_court' ||
        tags.amenity === 'ice_cream' || tags.amenity === 'biergarten') {
        return 'restaurant';
    }
    // Hotels/Accommodation
    if (tags.tourism === 'hotel' || tags.tourism === 'hostel' || 
        tags.tourism === 'guest_house' || tags.tourism === 'motel' ||
        tags.tourism === 'apartment' || tags.tourism === 'chalet') {
        return 'hotel';
    }
    // Historic Places (check this BEFORE general attractions)
    if (tags.historic || tags.heritage || tags.memorial ||
        tags.building === 'church' || tags.building === 'cathedral' ||
        tags.building === 'mosque' || tags.building === 'synagogue' ||
        tags.building === 'temple' || tags.amenity === 'place_of_worship' ||
        tags.man_made === 'tower' || tags.man_made === 'lighthouse') {
        return 'attraction';
    }
    // Attractions/Culture
    if (tags.tourism === 'attraction' || tags.tourism === 'museum' || 
        tags.tourism === 'gallery' || tags.tourism === 'viewpoint' ||
        tags.tourism === 'artwork' || tags.tourism === 'zoo' ||
        tags.tourism === 'aquarium' || tags.tourism === 'theme_park' ||
        tags.amenity === 'theatre' || tags.amenity === 'cinema' ||
        tags.amenity === 'arts_centre' || tags.amenity === 'nightclub' ||
        tags.amenity === 'casino') {
        return 'attraction';
    }
    // Nature
    if (tags.leisure === 'park' || tags.leisure === 'garden' || 
        tags.leisure === 'nature_reserve' || tags.leisure === 'beach_resort' ||
        tags.leisure === 'marina' || tags.natural ||
        tags.tourism === 'picnic_site') {
        return 'nature';
    }
    // Shopping
    if (tags.shop || tags.amenity === 'marketplace') {
        return 'shopping';
    }
    return 'attraction';
}

function generateDescription(tags) {
    const parts = [];
    
    // Historic info
    if (tags.historic) {
        const historicTypes = {
            'monument': '🏛️ Monument',
            'memorial': '🎖️ Memorial',
            'castle': '🏰 Castle',
            'ruins': '🏚️ Historic Ruins',
            'archaeological_site': '🏺 Archaeological Site',
            'church': '⛪ Church',
            'mosque': '🕌 Mosque',
            'palace': '👑 Palace',
            'fort': '🏰 Fort',
            'tower': '🗼 Tower',
            'building': '🏛️ Historic Building'
        };
        parts.push(historicTypes[tags.historic] || `🏛️ Historic: ${tags.historic}`);
    }
    
    if (tags.heritage) parts.push('🌟 Heritage Site');
    if (tags.cuisine) parts.push(`🍴 ${tags.cuisine}`);
    if (tags.opening_hours) parts.push(`🕐 ${tags.opening_hours.substring(0, 30)}`);
    if (tags.phone) parts.push(`📞 ${tags.phone}`);
    if (tags.website) parts.push('🌐 Website');
    if (tags.wheelchair === 'yes') parts.push('♿ Accessible');
    if (tags.stars) parts.push(`⭐ ${tags.stars} stars`);
    if (tags['addr:street']) parts.push(`📍 ${tags['addr:street']}`);
    if (tags.religion) parts.push(`🙏 ${tags.religion}`);
    
    return parts.join(' • ') || 'Click + to add to your trip';
}

function showDemoPlaces(lat, lng, radius = 1000) {
    // Generate demo places based on radius
    const scaleFactor = radius / 1000;
    const demoPlaces = [
        { name: 'Local Restaurant', category: 'restaurant', offset: [0.002 * scaleFactor, 0.003 * scaleFactor] },
        { name: 'City Museum', category: 'attraction', offset: [-0.001 * scaleFactor, 0.002 * scaleFactor] },
        { name: 'Grand Hotel', category: 'hotel', offset: [0.003 * scaleFactor, -0.001 * scaleFactor] },
        { name: 'Central Park', category: 'nature', offset: [-0.002 * scaleFactor, -0.002 * scaleFactor] },
        { name: 'Shopping Mall', category: 'shopping', offset: [0.001 * scaleFactor, -0.003 * scaleFactor] },
        { name: 'Historic Cafe', category: 'restaurant', offset: [-0.003 * scaleFactor, 0.001 * scaleFactor] },
        { name: 'Art Gallery', category: 'attraction', offset: [0.002 * scaleFactor, -0.002 * scaleFactor] },
        { name: 'Boutique Hotel', category: 'hotel', offset: [-0.001 * scaleFactor, -0.001 * scaleFactor] },
        { name: 'Beach Resort', category: 'nature', offset: [0.004 * scaleFactor, 0.001 * scaleFactor] },
        { name: 'Fashion Store', category: 'shopping', offset: [-0.002 * scaleFactor, 0.003 * scaleFactor] },
    ];

    AppState.nearbyPlaces = demoPlaces.map((demo, idx) => ({
        id: `demo_${idx}_${Date.now()}`,
        name: demo.name,
        category: demo.category,
        description: 'Sample place - Click to add to your trip',
        lat: lat + demo.offset[0],
        lng: lng + demo.offset[1],
        distance: Math.random() * (radius * 0.8) + (radius * 0.1)
    }));

    // Sort by distance
    AppState.nearbyPlaces.sort((a, b) => a.distance - b.distance);

    displayNearbyPlaces();
}

// ========================================
// Display Nearby Places
// ========================================
function displayNearbyPlaces() {
    // Add markers to map
    AppState.nearbyPlaces.forEach(place => {
        addPlaceMarker(place);
    });

    // Update sidebar list
    updatePlacesList();
}

function addPlaceMarker(place) {
    const marker = L.marker([place.lat, place.lng], {
        icon: createCustomIcon(place.category)
    });

    const popupContent = createPopupContent(place);
    marker.bindPopup(popupContent, { maxWidth: 280 });
    
    marker.on('click', () => {
        AppState.selectedPlace = place;
        showLocationDetails(place);
    });
    
    marker.addTo(AppState.map);
    place.marker = marker;
    AppState.markers.push(marker);
}

function createPopupContent(place) {
    const isFavorited = AppState.favorites.includes(place.id);
    const isInTrip = isPlaceInAnyTrip(place.id);
    
    return `
        <div class="marker-popup">
            <div class="popup-header">
                <span class="popup-category ${place.category}">${getCategoryEmoji(place.category)}</span>
                <h4>${place.name}</h4>
            </div>
            <p class="popup-description">${place.description}</p>
            ${place.distance ? `<p class="popup-distance"><i class="fas fa-walking"></i> ${Math.round(place.distance)}m away</p>` : ''}
            <div class="popup-actions">
                <button class="btn btn-small btn-primary popup-add-btn" onclick="quickAddToTrip('${place.id}')">
                    <i class="fas fa-plus"></i> Add to Trip
                </button>
                <button class="btn btn-small btn-secondary ${isFavorited ? 'favorited' : ''}" onclick="toggleFavorite('${place.id}')">
                    <i class="${isFavorited ? 'fas' : 'far'} fa-heart"></i>
                </button>
            </div>
        </div>
    `;
}

function getCategoryEmoji(category) {
    const emojis = {
        restaurant: '🍽️',
        hotel: '🏨',
        attraction: '🏛️',
        nature: '🌳',
        shopping: '🛍️'
    };
    return emojis[category] || '📍';
}

function createCustomIcon(category) {
    const iconMap = {
        restaurant: 'fa-utensils',
        hotel: 'fa-hotel',
        attraction: 'fa-landmark',
        nature: 'fa-tree',
        shopping: 'fa-shopping-bag'
    };

    const icon = iconMap[category] || 'fa-map-marker-alt';

    return L.divIcon({
        className: 'custom-marker-wrapper',
        html: `<div class="custom-marker ${category}"><i class="fas ${icon}"></i></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
    });
}

function clearNearbyMarkers() {
    AppState.markers.forEach(marker => {
        AppState.map.removeLayer(marker);
    });
    AppState.markers = [];
    AppState.nearbyPlaces = [];
    hideLocationDetails();
}

function filterMarkersByCategory(category) {
    AppState.currentCategory = category;
    
    AppState.nearbyPlaces.forEach(place => {
        if (place.marker) {
            if (category === 'all' || place.category === category) {
                place.marker.addTo(AppState.map);
            } else {
                AppState.map.removeLayer(place.marker);
            }
        }
    });
    
    updatePlacesList();
}

// ========================================
// Update Sidebar Places List
// ========================================
function updatePlacesList() {
    const detailsSection = document.getElementById('locationDetails');
    
    const filteredPlaces = AppState.currentCategory === 'all' 
        ? AppState.nearbyPlaces 
        : AppState.nearbyPlaces.filter(p => p.category === AppState.currentCategory);

    if (filteredPlaces.length === 0) {
        detailsSection.classList.add('hidden');
        return;
    }

    // Show places list in sidebar
    const placesHTML = `
        <h3 class="section-title">
            <i class="fas fa-map-pin"></i>
            Nearby Places (${filteredPlaces.length})
        </h3>
        <div class="places-list">
            ${filteredPlaces.map(place => `
                <div class="place-item" onclick="focusOnPlace('${place.id}')">
                    <div class="place-icon ${place.category}">
                        ${getCategoryEmoji(place.category)}
                    </div>
                    <div class="place-info">
                        <h4>${place.name}</h4>
                        <span class="place-distance">
                            <i class="fas fa-walking"></i> ${Math.round(place.distance || 0)}m
                        </span>
                    </div>
                    <button class="place-add-btn" onclick="event.stopPropagation(); quickAddToTrip('${place.id}')" title="Add to Trip">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            `).join('')}
        </div>
    `;

    detailsSection.innerHTML = placesHTML;
    detailsSection.classList.remove('hidden');
}

function focusOnPlace(placeId) {
    const place = AppState.nearbyPlaces.find(p => p.id === placeId);
    if (place && place.marker) {
        AppState.map.setView([place.lat, place.lng], 17);
        place.marker.openPopup();
        AppState.selectedPlace = place;
    }
}

// ========================================
// Location Details
// ========================================
function showLocationDetails(place) {
    AppState.selectedPlace = place;
    updatePlacesList();
}

function hideLocationDetails() {
    document.getElementById('locationDetails').classList.add('hidden');
    AppState.selectedPlace = null;
}

// ========================================
// Section Switching (Navigation)
// ========================================
function switchSection(section) {
    AppState.currentSection = section;
    
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === section);
    });
    
    // Clear current markers
    clearNearbyMarkers();
    if (AppState.searchCircle) {
        AppState.map.removeLayer(AppState.searchCircle);
        AppState.searchCircle = null;
    }
    
    // Update sidebar content based on section
    const detailsSection = document.getElementById('locationDetails');
    
    switch(section) {
        case 'explore':
            detailsSection.classList.add('hidden');
            showToast('👆 Click on map to discover places!', 'info');
            break;
            
        case 'trips':
            showTripsOnSidebar();
            break;
            
        case 'favorites':
            showFavoritesOnMap();
            break;
    }
}

function showTripsOnSidebar() {
    const detailsSection = document.getElementById('locationDetails');
    
    if (AppState.trips.length === 0) {
        detailsSection.innerHTML = `
            <h3 class="section-title">
                <i class="fas fa-suitcase-rolling"></i>
                My Trips
            </h3>
            <div class="empty-state-small">
                <i class="fas fa-compass"></i>
                <p>No trips yet</p>
                <button class="btn btn-primary btn-small" onclick="openCreateTripModal()">
                    <i class="fas fa-plus"></i> Create Trip
                </button>
            </div>
        `;
    } else {
        const tripsHTML = AppState.trips.map(trip => `
            <div class="sidebar-trip-item" onclick="viewTripOnMap('${trip.id}')">
                <div class="trip-icon ${trip.icon.replace('fa-', '')}">
                    <i class="fas ${trip.icon}"></i>
                </div>
                <div class="trip-info">
                    <h4>${trip.name}</h4>
                    <span>${trip.locations.length} places • ${formatDateRange(trip.startDate, trip.endDate)}</span>
                </div>
                <i class="fas fa-chevron-right"></i>
            </div>
        `).join('');
        
        detailsSection.innerHTML = `
            <h3 class="section-title">
                <i class="fas fa-suitcase-rolling"></i>
                My Trips (${AppState.trips.length})
            </h3>
            <div class="sidebar-trips-list">
                ${tripsHTML}
            </div>
            <button class="btn btn-primary btn-full" onclick="openCreateTripModal()" style="margin-top: var(--space-md);">
                <i class="fas fa-plus"></i> Create New Trip
            </button>
        `;
    }
    
    detailsSection.classList.remove('hidden');
}

function showFavoritesOnMap() {
    const detailsSection = document.getElementById('locationDetails');
    
    // Get favorite places from stored data
    const favoritePlaces = AppState.favoritePlaces.filter(p => 
        AppState.favorites.includes(p.id)
    );
    
    if (favoritePlaces.length === 0) {
        detailsSection.innerHTML = `
            <h3 class="section-title">
                <i class="fas fa-heart"></i>
                Favorites
            </h3>
            <div class="empty-state-small">
                <i class="fas fa-heart"></i>
                <p>No favorites yet</p>
                <p class="hint">Click ❤️ on places to save them</p>
            </div>
        `;
        detailsSection.classList.remove('hidden');
        return;
    }
    
    // Show favorites on map
    favoritePlaces.forEach(place => {
        addPlaceMarker(place);
    });
    
    // Update AppState.nearbyPlaces for UI consistency
    AppState.nearbyPlaces = favoritePlaces;
    
    // Fit map to favorites
    if (favoritePlaces.length > 0) {
        const bounds = favoritePlaces.map(p => [p.lat, p.lng]);
        AppState.map.fitBounds(bounds, { padding: [50, 50] });
    }
    
    // Show list
    const favHTML = favoritePlaces.map(place => `
        <div class="place-item" onclick="focusOnPlace('${place.id}')">
            <div class="place-icon ${place.category}">
                ${getCategoryEmoji(place.category)}
            </div>
            <div class="place-info">
                <h4>${place.name}</h4>
                <span class="place-category-label">${place.category}</span>
            </div>
            <button class="place-remove-btn" onclick="event.stopPropagation(); toggleFavorite('${place.id}')" title="Remove from favorites">
                <i class="fas fa-heart"></i>
            </button>
        </div>
    `).join('');
    
    detailsSection.innerHTML = `
        <h3 class="section-title">
            <i class="fas fa-heart"></i>
            Favorites (${favoritePlaces.length})
        </h3>
        <div class="places-list">
            ${favHTML}
        </div>
    `;
    detailsSection.classList.remove('hidden');
    
    showToast(`Showing ${favoritePlaces.length} favorite places`, 'success');
}

function viewTripOnMap(tripId) {
    const trip = AppState.trips.find(t => t.id === tripId);
    if (!trip || trip.locations.length === 0) {
        showToast('No locations in this trip yet', 'info');
        return;
    }
    
    // Clear existing markers
    clearNearbyMarkers();
    
    // Add markers for trip locations
    trip.locations.forEach(loc => {
        const place = {
            id: loc.id,
            name: loc.name,
            category: loc.category || 'attraction',
            description: loc.description || '',
            lat: loc.lat,
            lng: loc.lng
        };
        addPlaceMarker(place);
    });
    
    // Update nearbyPlaces for consistent behavior
    AppState.nearbyPlaces = trip.locations.map(loc => ({
        id: loc.id,
        name: loc.name,
        category: loc.category || 'attraction',
        description: loc.description || '',
        lat: loc.lat,
        lng: loc.lng
    }));
    
    // Fit map to bounds
    const bounds = trip.locations.map(l => [l.lat, l.lng]);
    AppState.map.fitBounds(bounds, { padding: [50, 50] });
    
    // Show trip details in sidebar
    const detailsSection = document.getElementById('locationDetails');
    const locationsHTML = trip.locations.map((loc, index) => `
        <div class="place-item" onclick="focusOnPlace('${loc.id}')">
            <div class="place-order">${index + 1}</div>
            <div class="place-info">
                <h4>${loc.name}</h4>
                <span class="place-category-label">${loc.category || 'attraction'}</span>
            </div>
            <button class="place-remove-btn" onclick="event.stopPropagation(); removeLocationFromTrip('${trip.id}', '${loc.id}')" title="Remove">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
    
    detailsSection.innerHTML = `
        <h3 class="section-title">
            <i class="fas ${trip.icon}"></i>
            ${trip.name}
        </h3>
        <p style="color: var(--text-muted); margin-bottom: var(--space-md);">
            <i class="fas fa-calendar"></i> ${formatDateRange(trip.startDate, trip.endDate)}
        </p>
        <div class="places-list">
            ${locationsHTML}
        </div>
        <div style="margin-top: var(--space-md); display: flex; gap: var(--space-sm);">
            <button class="btn btn-secondary btn-small" onclick="switchSection('trips')">
                <i class="fas fa-arrow-left"></i> Back
            </button>
            <button class="btn btn-danger btn-small" onclick="if(confirm('Delete this trip?')) { deleteTrip('${trip.id}'); switchSection('trips'); }">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;
    detailsSection.classList.remove('hidden');
    
    showToast(`Viewing "${trip.name}" - ${trip.locations.length} places`, 'success');
}

function focusOnPlace(placeId) {
    const place = AppState.nearbyPlaces.find(p => p.id === placeId) || 
                  AppState.favoritePlaces.find(p => p.id === placeId);
    if (!place) return;
    
    // Pan to location
    AppState.map.setView([place.lat, place.lng], 16);
    
    // Open popup if marker exists
    if (place.marker) {
        place.marker.openPopup();
    }
}

// ========================================
// Trip Functions
// ========================================
function quickAddToTrip(placeId) {
    const place = AppState.nearbyPlaces.find(p => p.id === placeId);
    if (!place) return;

    AppState.selectedPlace = place;

    if (AppState.trips.length === 0) {
        // No trips - create one first
        openCreateTripModal();
        showToast('Create a trip first!', 'info');
        return;
    }

    if (AppState.trips.length === 1) {
        // Only one trip - add directly
        addPlaceToTrip(AppState.trips[0].id, place);
    } else {
        // Multiple trips - show selection modal
        openAddToTripModal();
    }
}

function addPlaceToTrip(tripId, place = null) {
    const trip = AppState.trips.find(t => t.id === tripId);
    const placeToAdd = place || AppState.selectedPlace;

    if (!trip || !placeToAdd) return;

    // Check if already in trip
    if (trip.locations.some(l => l.id === placeToAdd.id)) {
        showToast('Already in this trip!', 'error');
        return;
    }

    trip.locations.push({
        id: placeToAdd.id,
        name: placeToAdd.name,
        category: placeToAdd.category,
        lat: placeToAdd.lat,
        lng: placeToAdd.lng,
        order: trip.locations.length + 1
    });

    saveToLocalStorage();
    renderTrips();
    updateStats();
    closeModal('addToTripModal');
    
    // Update popup if open
    if (placeToAdd.marker) {
        placeToAdd.marker.setPopupContent(createPopupContent(placeToAdd));
    }
    
    showToast(`Added "${placeToAdd.name}" to "${trip.name}"!`, 'success');
}

function isPlaceInAnyTrip(placeId) {
    return AppState.trips.some(trip => 
        trip.locations.some(loc => loc.id === placeId)
    );
}

function createTrip(tripData) {
    const newTrip = {
        id: generateId(),
        name: tripData.name,
        startDate: tripData.startDate,
        endDate: tripData.endDate,
        icon: tripData.icon,
        notes: tripData.notes,
        locations: [],
        createdAt: new Date().toISOString()
    };

    AppState.trips.push(newTrip);
    saveToLocalStorage();
    renderTrips();
    updateStats();
    
    // If there's a pending place to add, add it now
    if (AppState.selectedPlace) {
        addPlaceToTrip(newTrip.id, AppState.selectedPlace);
    }
    
    return newTrip;
}

function deleteTrip(tripId) {
    const index = AppState.trips.findIndex(t => t.id === tripId);
    if (index > -1) {
        AppState.trips.splice(index, 1);
        saveToLocalStorage();
        renderTrips();
        updateStats();
        showToast('Trip deleted', 'info');
    }
}

function removeLocationFromTrip(tripId, locationId) {
    const trip = AppState.trips.find(t => t.id === tripId);
    if (trip) {
        trip.locations = trip.locations.filter(l => l.id !== locationId);
        // Reorder remaining locations
        trip.locations.forEach((loc, idx) => loc.order = idx + 1);
        saveToLocalStorage();
        renderTrips();
        showToast('Location removed from trip', 'info');
    }
}

function renderTrips() {
    const tripsList = document.getElementById('tripsList');
    const emptyState = document.getElementById('emptyTrips');

    if (AppState.trips.length === 0) {
        tripsList.innerHTML = '';
        tripsList.appendChild(emptyState);
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    
    const tripsHTML = AppState.trips.map(trip => {
        const locationsList = trip.locations.slice(0, 4).map((loc, idx) => `
            <div class="trip-location-item">
                <span class="location-number">${idx + 1}</span>
                <span class="location-name">${loc.name}</span>
                <button class="location-remove-btn" onclick="event.stopPropagation(); removeLocationFromTrip('${trip.id}', '${loc.id}')" title="Remove">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');

        const moreLocations = trip.locations.length > 4 
            ? `<div class="trip-location-item more"><span class="location-name">+${trip.locations.length - 4} more places</span></div>` 
            : '';

        return `
            <div class="trip-card ${AppState.selectedTrip?.id === trip.id ? 'active' : ''}" data-trip-id="${trip.id}">
                <div class="trip-header">
                    <div class="trip-icon">
                        <i class="fas ${trip.icon}"></i>
                    </div>
                    <div class="trip-title">
                        <h4>${trip.name}</h4>
                        <span class="trip-date">${formatDateRange(trip.startDate, trip.endDate)}</span>
                    </div>
                    <button class="btn-icon trip-menu" onclick="event.stopPropagation(); confirmDeleteTrip('${trip.id}')" title="Delete Trip">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                ${trip.locations.length > 0 ? `
                    <div class="trip-locations">
                        ${locationsList}
                        ${moreLocations}
                    </div>
                ` : '<p class="trip-empty-message">Click + on places to add them here</p>'}
                <div class="trip-footer">
                    <span class="trip-places">
                        <i class="fas fa-map-pin"></i> ${trip.locations.length} places
                    </span>
                    <button class="btn btn-text" onclick="viewTripOnMap('${trip.id}')">
                        View on Map <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    tripsList.innerHTML = tripsHTML;
}

function confirmDeleteTrip(tripId) {
    if (confirm('Delete this trip?')) {
        deleteTrip(tripId);
    }
}

function viewTripOnMap(tripId) {
    const trip = AppState.trips.find(t => t.id === tripId);
    if (!trip || trip.locations.length === 0) {
        showToast('No locations in this trip', 'info');
        return;
    }

    // Clear current markers
    clearNearbyMarkers();
    
    if (AppState.searchCircle) {
        AppState.map.removeLayer(AppState.searchCircle);
        AppState.searchCircle = null;
    }

    // Add trip locations as markers
    const bounds = [];
    trip.locations.forEach(loc => {
        const place = {
            id: loc.id,
            name: loc.name,
            category: loc.category || 'attraction',
            description: `Stop #${loc.order} in ${trip.name}`,
            lat: loc.lat,
            lng: loc.lng
        };
        addPlaceMarker(place);
        bounds.push([loc.lat, loc.lng]);
    });

    // Draw route line
    if (bounds.length > 1) {
        const routeLine = L.polyline(bounds, {
            color: '#0ea5e9',
            weight: 3,
            opacity: 0.7,
            dashArray: '10, 10'
        }).addTo(AppState.map);
        AppState.markers.push(routeLine);
    }

    // Fit map to bounds
    if (bounds.length > 0) {
        AppState.map.fitBounds(bounds, { padding: [50, 50] });
    }

    AppState.selectedTrip = trip;
    showToast(`Viewing "${trip.name}"`, 'info');
}

// ========================================
// Favorites Functions
// ========================================
function toggleFavorite(placeId) {
    const index = AppState.favorites.indexOf(placeId);
    
    if (index > -1) {
        // Remove from favorites
        AppState.favorites.splice(index, 1);
        AppState.favoritePlaces = AppState.favoritePlaces.filter(p => p.id !== placeId);
        showToast('Removed from favorites', 'info');
    } else {
        // Add to favorites
        AppState.favorites.push(placeId);
        // Save place data for later retrieval
        const place = AppState.nearbyPlaces.find(p => p.id === placeId);
        if (place && !AppState.favoritePlaces.find(p => p.id === placeId)) {
            AppState.favoritePlaces.push({
                id: place.id,
                name: place.name,
                category: place.category,
                description: place.description,
                lat: place.lat,
                lng: place.lng,
                tags: place.tags
            });
        }
        showToast('Added to favorites! ❤️', 'success');
    }

    saveToLocalStorage();
    updateStats();

    // Update popup
    const place = AppState.nearbyPlaces.find(p => p.id === placeId);
    if (place && place.marker) {
        place.marker.setPopupContent(createPopupContent(place));
    }
    
    // Refresh favorites view if currently viewing favorites
    if (AppState.currentSection === 'favorites') {
        showFavoritesOnMap();
    }
}

// ========================================
// Modal Functions
// ========================================
function openCreateTripModal() {
    document.getElementById('createTripForm').reset();
    // Set default dates
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    document.getElementById('tripStartDate').value = formatDate(today);
    document.getElementById('tripEndDate').value = formatDate(nextWeek);
    // Reset icon selection
    document.querySelectorAll('.icon-option').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.icon-option[data-icon="fa-umbrella-beach"]').classList.add('active');
    document.getElementById('tripIconValue').value = 'fa-umbrella-beach';
    openModal('createTripModal');
}

function openAddToTripModal() {
    const tripSelectList = document.getElementById('tripSelectList');
    
    if (AppState.trips.length === 0) {
        tripSelectList.innerHTML = '<p class="empty-message">No trips available. Create one first!</p>';
    } else {
        tripSelectList.innerHTML = AppState.trips.map(trip => `
            <div class="trip-select-option" onclick="addPlaceToTrip('${trip.id}')">
                <div class="trip-icon">
                    <i class="fas ${trip.icon}"></i>
                </div>
                <span class="trip-name">${trip.name}</span>
                <span class="trip-count">${trip.locations.length} places</span>
            </div>
        `).join('');
    }
    
    openModal('addToTripModal');
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = '';
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = '';
}

// ========================================
// Event Listeners
// ========================================
function initializeEventListeners() {
    // Theme Toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Navigation Links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            switchSection(section);
        });
    });

    // Search Radius Slider
    const radiusSlider = document.getElementById('searchRadius');
    const rangeValue = document.getElementById('rangeValue');
    
    if (radiusSlider) {
        // Set initial value from state
        radiusSlider.value = AppState.searchRadius;
        if (AppState.searchRadius >= 1000) {
            rangeValue.textContent = `${AppState.searchRadius / 1000} km`;
        } else {
            rangeValue.textContent = `${AppState.searchRadius}m`;
        }
        
        radiusSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            AppState.searchRadius = value;
            
            // Update display
            if (value >= 1000) {
                rangeValue.textContent = `${value / 1000} km`;
            } else {
                rangeValue.textContent = `${value}m`;
            }
            
            // Update circle if exists
            if (AppState.searchCircle) {
                AppState.searchCircle.setRadius(value);
            }
        });
    }

    // Map Controls
    document.getElementById('locateMe').addEventListener('click', locateUser);
    document.getElementById('zoomIn').addEventListener('click', () => AppState.map.zoomIn());
    document.getElementById('zoomOut').addEventListener('click', () => AppState.map.zoomOut());
    document.getElementById('clearMarkers').addEventListener('click', () => {
        clearNearbyMarkers();
        if (AppState.searchCircle) {
            AppState.map.removeLayer(AppState.searchCircle);
            AppState.searchCircle = null;
        }
        showToast('Map cleared', 'info');
    });

    // FAB - Show instruction
    document.getElementById('addLocationFab').addEventListener('click', () => {
        showToast('👆 Click anywhere on the map to discover places!', 'info');
    });

    // Category Chips
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const category = chip.dataset.category;
            filterMarkersByCategory(category);
        });
    });

    // Search
    document.getElementById('searchInput').addEventListener('input', debounce(handleSearch, 300));

    // Create Trip Buttons
    document.getElementById('createTripBtn').addEventListener('click', openCreateTripModal);
    document.getElementById('createFirstTrip')?.addEventListener('click', openCreateTripModal);

    // Modal Close Buttons
    document.getElementById('closeAddLocation')?.addEventListener('click', () => closeModal('addLocationModal'));
    document.getElementById('cancelAddLocation')?.addEventListener('click', () => closeModal('addLocationModal'));
    document.getElementById('closeCreateTrip').addEventListener('click', () => closeModal('createTripModal'));
    document.getElementById('cancelCreateTrip').addEventListener('click', () => closeModal('createTripModal'));
    document.getElementById('closeAddToTrip').addEventListener('click', () => closeModal('addToTripModal'));

    // Modal Overlays
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', closeAllModals);
    });

    // Save Trip
    document.getElementById('saveTrip').addEventListener('click', () => {
        const name = document.getElementById('tripName').value.trim();
        const startDate = document.getElementById('tripStartDate').value;
        const endDate = document.getElementById('tripEndDate').value;
        const icon = document.getElementById('tripIconValue').value;
        const notes = document.getElementById('tripNotes').value.trim();

        if (!name || !startDate || !endDate) {
            showToast('Please fill in required fields', 'error');
            return;
        }

        createTrip({ name, startDate, endDate, icon, notes });
        closeModal('createTripModal');
        showToast('Trip created! 🎉', 'success');
    });

    // Icon Picker
    document.querySelectorAll('.icon-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            document.getElementById('tripIconValue').value = option.dataset.icon;
        });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

// ========================================
// Search Function
// ========================================
function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    
    if (!query) {
        filterMarkersByCategory(AppState.currentCategory);
        return;
    }

    AppState.nearbyPlaces.forEach(place => {
        const matches = place.name.toLowerCase().includes(query) ||
                       (place.description && place.description.toLowerCase().includes(query));
        
        if (place.marker) {
            if (matches) {
                place.marker.addTo(AppState.map);
            } else {
                AppState.map.removeLayer(place.marker);
            }
        }
    });
    
    updatePlacesList();
}

// ========================================
// Theme Functions
// ========================================
function toggleTheme() {
    AppState.isDarkTheme = !AppState.isDarkTheme;
    document.documentElement.setAttribute('data-theme', AppState.isDarkTheme ? 'dark' : 'light');
    
    const icon = document.querySelector('#themeToggle i');
    icon.className = AppState.isDarkTheme ? 'fas fa-sun' : 'fas fa-moon';
    
    localStorage.setItem('theme', AppState.isDarkTheme ? 'dark' : 'light');
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        AppState.isDarkTheme = true;
        document.documentElement.setAttribute('data-theme', 'dark');
        document.querySelector('#themeToggle i').className = 'fas fa-sun';
    }
}

// ========================================
// Geolocation
// ========================================
function locateUser() {
    if (!navigator.geolocation) {
        showToast('Geolocation not supported', 'error');
        return;
    }

    showToast('Finding your location...', 'info');

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            AppState.map.setView([latitude, longitude], 15);
            
            // Add user location marker
            const userMarker = L.circleMarker([latitude, longitude], {
                color: '#0ea5e9',
                fillColor: '#38bdf8',
                fillOpacity: 0.8,
                radius: 10,
                weight: 3
            }).addTo(AppState.map);
            
            userMarker.bindPopup('<div class="marker-popup"><h4>📍 You are here!</h4><p>Click around to discover places</p></div>').openPopup();
            
            showToast('Location found! Click to explore nearby places.', 'success');
        },
        (error) => {
            showToast('Could not get your location', 'error');
        }
    );
}

// ========================================
// Local Storage
// ========================================
function saveToLocalStorage() {
    const data = {
        trips: AppState.trips,
        favorites: AppState.favorites,
        favoritePlaces: AppState.favoritePlaces
    };
    localStorage.setItem('travelPlannerData', JSON.stringify(data));
}

function loadFromLocalStorage() {
    loadTheme();
    
    const saved = localStorage.getItem('travelPlannerData');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            AppState.trips = data.trips || [];
            AppState.favorites = data.favorites || [];
            AppState.favoritePlaces = data.favoritePlaces || [];
        } catch (e) {
            console.error('Error loading data:', e);
        }
    }
}

// ========================================
// Stats
// ========================================
function updateStats() {
    const totalPlaces = AppState.trips.reduce((sum, trip) => sum + trip.locations.length, 0);
    document.getElementById('placesCount').textContent = totalPlaces;
    document.getElementById('tripsCount').textContent = AppState.trips.length;
    document.getElementById('favoritesCount').textContent = AppState.favorites.length;
}

// ========================================
// Loading State
// ========================================
function showLoadingState(show) {
    const fab = document.getElementById('addLocationFab');
    if (show) {
        fab.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        fab.disabled = true;
    } else {
        fab.innerHTML = '<i class="fas fa-search"></i>';
        fab.disabled = false;
    }
}

// ========================================
// Toast Notifications
// ========================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
        success: 'fa-check',
        error: 'fa-times',
        info: 'fa-info'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${iconMap[type]}"></i>
        </div>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========================================
// Utility Functions
// ========================================
function generateId() {
    return 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function formatDateRange(start, end) {
    const options = { month: 'short', day: 'numeric' };
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    const startStr = startDate.toLocaleDateString('en-US', options);
    const endStr = endDate.toLocaleDateString('en-US', { ...options, year: 'numeric' });
    
    return `${startStr} - ${endStr}`;
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Make functions globally available for onclick handlers
window.quickAddToTrip = quickAddToTrip;
window.addPlaceToTrip = addPlaceToTrip;
window.toggleFavorite = toggleFavorite;
window.viewTripOnMap = viewTripOnMap;
window.confirmDeleteTrip = confirmDeleteTrip;
window.removeLocationFromTrip = removeLocationFromTrip;
window.focusOnPlace = focusOnPlace;
window.switchSection = switchSection;
window.openCreateTripModal = openCreateTripModal;
window.deleteTrip = deleteTrip;
