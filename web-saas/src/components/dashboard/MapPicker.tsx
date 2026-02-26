'use client'

import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon issue
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

L.Marker.prototype.options.icon = defaultIcon

interface MapPickerProps {
  initialLat?: number
  initialLng?: number
  onLocationChange?: (lat: number, lng: number) => void
  height?: string
}

function MapEvents({ onLocationChange }: { onLocationChange?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      if (onLocationChange) {
        onLocationChange(e.latlng.lat, e.latlng.lng)
      }
    }
  })
  return null
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], map.getZoom())
  }, [lat, lng, map])
  return null
}

export default function MapPicker({
  initialLat = 0,
  initialLng = 0,
  onLocationChange,
  height = '300px'
}: MapPickerProps) {
  const [position, setPosition] = useState<[number, number]>([initialLat, initialLng])
  const [hasLocation, setHasLocation] = useState(false)

  useEffect(() => {
    if (initialLat && initialLng) {
      setPosition([initialLat, initialLng])
      setHasLocation(true)
    }
  }, [initialLat, initialLng])

  const handleLocationChange = useCallback((lat: number, lng: number) => {
    setPosition([lat, lng])
    setHasLocation(true)
    if (onLocationChange) {
      onLocationChange(lat, lng)
    }
  }, [onLocationChange])

  // Default to a central location if no coordinates provided
  const defaultCenter: [number, number] = hasLocation 
    ? position 
    : [28.6139, 77.2090] // Delhi, India as default

  return (
    <div className="space-y-2">
      <div 
        className="rounded-md border overflow-hidden"
        style={{ height }}
      >
        <MapContainer
          center={defaultCenter}
          zoom={hasLocation ? 15 : 5}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEvents onLocationChange={handleLocationChange} />
          {hasLocation && (
            <>
              <Marker position={position} draggable={true} 
                eventHandlers={{
                  dragend: (e) => {
                    const marker = e.target
                    const newPos = marker.getLatLng()
                    handleLocationChange(newPos.lat, newPos.lng)
                  }
                }}
              />
              <RecenterMap lat={position[0]} lng={position[1]} />
            </>
          )}
        </MapContainer>
      </div>
      
      <div className="text-xs text-muted-foreground">
        {hasLocation ? (
          <span className="text-green-600">
            📍 Location set: {position[0].toFixed(6)}, {position[1].toFixed(6)}
          </span>
        ) : (
          <span>Click on map to set branch location, or drag the marker</span>
        )}
      </div>
    </div>
  )
}
