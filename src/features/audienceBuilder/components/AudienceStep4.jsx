import React, { useState } from 'react';
import { Paper, Box, Typography, Tabs, Tab, FormControl, InputLabel, Select, MenuItem, Button, Menu, TextField, Card, IconButton, Divider, Checkbox, CircularProgress, useTheme, Avatar, Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, ListItemIcon, ToggleButton, ToggleButtonGroup, FormLabel, RadioGroup, FormControlLabel, Radio, Slider, DialogActions } from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import TvIcon from '@mui/icons-material/Tv';
import AddIcon from '@mui/icons-material/Add';
import RoomIcon from '@mui/icons-material/Room';
import CloseIcon from '@mui/icons-material/Close';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import StraightenIcon from '@mui/icons-material/Straighten';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PlaceIcon from '@mui/icons-material/Place';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import DownloadIcon from '@mui/icons-material/Download';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Tooltip from '@mui/material/Tooltip';
import { useAudienceBuilder } from '../AudienceBuilderContext.jsx';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import { DeckGL } from '@deck.gl/react';
import { StaticMap } from 'react-map-gl';
import { H3HexagonLayer } from '@deck.gl/geo-layers';
import * as h3 from 'h3-js';
import { WebMercatorViewport } from '@deck.gl/core';

const CATEGORY_OPTIONS = ['Store', 'Restaurant', 'Hotel', 'Gas Station'];
const NAME_OPTIONS = ['Morrisons', 'Asda', 'Aldi', 'Lidl', 'Sainsburys', 'Waitrose', 'Co-op', 'Tesco'];
const PIN_COLORS = ['#1976d2', '#FFD600', '#E53935']; // blue, yellow, red
const MAP_TYPE_OPTIONS = ['POI', 'Competitor Battleground'];
const BATTLEGROUND_OPTIONS = [
  { label: 'Battleground 1, 75% overlap', overlap: 75 },
  { label: 'Battleground 2, 70% overlap', overlap: 70 },
  { label: 'Battleground 3, 65% overlap', overlap: 65 },
  { label: 'Battleground 4, 60% overlap', overlap: 60 },
  { label: 'Battleground 5, 55% overlap', overlap: 55 },
];

// Helper: generate random lat/lngs within UK bounds
const UK_BOUNDS = {
  north: 58.7,
  south: 49.9,
  west: -8.6,
  east: 1.8,
};
function getRandomLatLng() {
  const lat = Math.random() * (UK_BOUNDS.north - UK_BOUNDS.south) + UK_BOUNDS.south;
  const lng = Math.random() * (UK_BOUNDS.east - UK_BOUNDS.west) + UK_BOUNDS.west;
  return [lat, lng];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const LayerCard = ({ category, name, color, stores, onRemove }) => (
  <Card sx={{ display: 'flex', alignItems: 'center', p: 1, mb: 1, boxShadow: 'none', border: '1px solid #e0e0e0', borderRadius: 2, gap: 1.5, minWidth: 260, minHeight: 48, position: 'relative' }}>
    <Avatar sx={{ bgcolor: 'transparent', width: 20, height: 20, mr: 1.5 }}>
      <RoomIcon sx={{ color, fontSize: 22 }} />
    </Avatar>
    <Box sx={{ flex: 1 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{name}</Typography>
      <Typography variant="body2" color="text.secondary">{stores} Stores</Typography>
    </Box>
    <IconButton size="small" onClick={onRemove} sx={{ ml: 1, position: 'absolute', right: 8, top: 8 }}>
      <CloseIcon fontSize="small" />
    </IconButton>
  </Card>
);

const getRandomPins = (count) => {
  // Generate random positions for pins (as percentages)
  // Only in the middle 40%: x from 30% to 70%, y from 15% to 85%
  return Array.from({ length: count }, () => ({
    x: Math.random() * 40 + 30, // 30% to 70%
    y: Math.random() * 70 + 15, // 15% to 85%
  }));
};

const getRandomHeatmapCenters = (count) => {
  // Generate random positions for heatmap circles (as percentages)
  // Only in the middle 40%: x from 30% to 70%, y from 20% to 80%
  return Array.from({ length: count }, () => ({
    x: Math.random() * 40 + 30, // 30% to 70%
    y: Math.random() * 60 + 20, // 20% to 80%
  }));
};

// Hex grid config
const HEX_ROWS = 4;
const HEX_COLS = 6;
const HEX_TOTAL = HEX_ROWS * HEX_COLS;
const HEX_SIZE = 60; // px
const HEX_H = HEX_SIZE * Math.sqrt(3) / 2;

// Generate mock battleground data for 5 battlegrounds
const generateBattlegroundHexData = () => {
  // For each battleground, generate an array of hexes with mock store counts
  return Array.from({ length: 5 }).map(() =>
    Array.from({ length: HEX_TOTAL }).map(() => {
      const client = getRandomInt(0, 8);
      const competitor = getRandomInt(0, 8);
      return { client, competitor };
    })
  );
};
const BATTLEGROUND_HEX_DATA = generateBattlegroundHexData();

// Score and color logic
function getHexScoreColor(client, competitor) {
  if (client > 2 && competitor > 2) return '#E53935'; // high competition (red)
  if (client > 2 && competitor === 0) return '#1976d2'; // client only (blue)
  if (client === 0 && competitor > 2) return '#FFD600'; // competitor only (yellow)
  if (client === 0 && competitor === 0) return '#bdbdbd'; // empty (grey)
  return '#90caf9'; // light blue for weak client
}

// Compute battleground score for popup
function getBattlegroundScore(hexData) {
  // Score: count of high competition hexes (red) divided by total
  const high = hexData.filter(h => getHexScoreColor(h.client, h.competitor) === '#E53935').length;
  return Math.round((high / hexData.length) * 100);
}

const TV_REGIONS = [
  'London', 'Midlands', 'North West', 'Yorkshire', 'North East', 'East', 'South', 'South West', 'Wales', 'West', 'Border', 'Central', 'Granada', 'HTV', 'Meridian', 'Tyne Tees', 'Ulster', 'Anglia', 'Carlton', 'LWT', 'Scottish', 'Grampian', 'Channel', 'STV', 'UTV'
];

// Generate random density score between 0 and 100
const getRandomDensityScore = () => Math.floor(Math.random() * 101);

const mockLinearSpots = [
  { channel: 'Channel 4', programme: 'Coronation Street', timeBand: 'Peak', indexScore: 158, impressions: '68,201' },
  { channel: 'Channel 4', programme: 'Top Gear', timeBand: 'Daytime', indexScore: 157, impressions: '107,617' },
  { channel: 'ITV1', programme: 'A League of Their Own', timeBand: 'Daytime', indexScore: 155, impressions: '83,406' },
  { channel: 'ITV2', programme: 'The Big Bang Theory', timeBand: 'Early Peak', indexScore: 154, impressions: '53,441' },
  { channel: 'E4', programme: 'Animal Rescue Live', timeBand: 'Early Peak', indexScore: 153, impressions: '46,773' },
  { channel: 'Dave', programme: "Britain's Got Talent", timeBand: 'Late Peak', indexScore: 153, impressions: '43,228' },
  { channel: 'Channel 5', programme: 'Location, Location, Location', timeBand: 'Early Evening', indexScore: 153, impressions: '85,377' },
  { channel: 'ITV2', programme: 'The One Show', timeBand: 'Peak', indexScore: 147, impressions: '21,178' },
  { channel: 'E4', programme: 'Modern Family', timeBand: 'Early Peak', indexScore: 145, impressions: '105,705' },
  { channel: 'Sky One', programme: 'Escape to the Country', timeBand: 'Peak', indexScore: 142, impressions: '28,992' },
  { channel: 'More4', programme: 'The Great British Bake Off', timeBand: 'Early Evening', indexScore: 139, impressions: '42,011' },
  { channel: 'Sky Max', programme: 'The Supervet', timeBand: 'Daytime', indexScore: 138, impressions: '62,023' },
  { channel: 'Channel 5', programme: 'Homes Under the Hammer', timeBand: 'Peak', indexScore: 138, impressions: '116,082' },
  { channel: 'Channel 4', programme: 'Come Dine With Me', timeBand: 'Early Evening', indexScore: 119, impressions: '85,208' },
  { channel: 'Dave', programme: 'Strictly Come Dancing', timeBand: 'Peak', indexScore: 117, impressions: '42,312' },
];

const AudienceStep4 = () => {
  // Force Vercel deployment update
  const ctx = useAudienceBuilder();
  const theme = useTheme();
  const minAudience = 100000;
  const maxAudience = 10000000;
  const { primaryScale, secondaryScale, constructionMode } = ctx;
  const [poiAnchorEl, setPoiAnchorEl] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null); // for audience size dropdown only
  const [category, setCategory] = useState('Store');
  const [name, setName] = useState('Morrisons');
  const [layers, setLayers] = useState([]);
  const [mapType, setMapType] = useState('POI');
  const [battlegroundDialogOpen, setBattlegroundDialogOpen] = useState(false);
  const [selectedBattlegrounds, setSelectedBattlegrounds] = useState([]);
  const [battlegroundMode, setBattlegroundMode] = useState('drive');
  const [tab, setTab] = useState('POI');
  const [locationType, setLocationType] = useState('TV region');
  const [selectedRegion, setSelectedRegion] = useState('');
  
  // Battleground form state
  const [battlegroundForm, setBattlegroundForm] = useState({
    zone_type: 'postcode',
    min_total_stores: 3,
    balance_slider: 50,
    filter_client_presence: true
  });
  const [battlegroundCard, setBattlegroundCard] = useState(null);
  // Audience size reduction state
  const [reducedAudienceSize, setReducedAudienceSize] = useState(null);
  const [battlegroundReduction, setBattlegroundReduction] = useState(null);
  // Red hexes state
  const [redHexes, setRedHexes] = useState([]);
  // New state variables
  const [selectedAudiences, setSelectedAudiences] = useState(['primary', 'secondary']);
  const [audienceLogic, setAudienceLogic] = useState('or');
  const [insightTab, setInsightTab] = useState('location');
  const [selectedSpots, setSelectedSpots] = useState([]);
  const allChecked = selectedSpots.length === mockLinearSpots.length;

  const handleAddLayerClick = (event) => {
    setPoiAnchorEl(event.currentTarget);
  };

  const handlePoiMenuClose = () => {
    setPoiAnchorEl(null);
  };

  const handleAddLayer = () => {
    const color = PIN_COLORS[layers.filter(l => !l.type).length % PIN_COLORS.length];
    const stores = getRandomInt(50, 200);
    const pins = getRandomPins(stores);
    setLayers([...layers, { category, name, color, stores, pins }]);
    setPoiAnchorEl(null);
  };

  const handleAddLocation = () => {
    if (locationType === 'TV region' && selectedRegion) {
      const color = PIN_COLORS[layers.filter(l => l.type).length % PIN_COLORS.length];
      setLayers([...layers, { name: selectedRegion, color, type: 'TV region' }]);
      setPoiAnchorEl(null);
    }
  };

  const handleRemoveLayer = idx => {
    setLayers(layers.filter((_, i) => i !== idx));
  };

  // Audience size and drive time (mocked)
  const audienceSize = 1000000 + layers.length * 50000;
  const driveTime = (8 + layers.length * 1.2).toFixed(1);

  // Battleground dialog logic
  const handleBattlegroundToggle = (label) => {
    setSelectedBattlegrounds((prev) =>
      prev.includes(label)
        ? prev.filter((l) => l !== label)
        : [...prev, label]
    );
  };

  const handleBattlegroundFormChange = (field, value) => {
    setBattlegroundForm(prev => ({ ...prev, [field]: value }));
  };

  // Helper to generate random non-overlapping hex positions
  function generateRedHexes(count = 10) {
    const hexes = [];
    const minDist = 12; // percent, min distance between centers
    let tries = 0;
    while (hexes.length < count && tries < 100) {
      const x = Math.random() * 30 + 35; // 35% to 65% (centered)
      const y = Math.random() * 30 + 35; // 35% to 65%
      if (hexes.every(h => Math.hypot(h.x - x, h.y - y) > minDist)) {
        hexes.push({ x, y });
      }
      tries++;
    }
    return hexes;
  }

  const handleApplyBattlegroundLogic = () => {
    setBattlegroundDialogOpen(false);
    setBattlegroundCard({
      score: battlegroundForm.balance_slider,
      zoneType: battlegroundForm.zone_type
    });
    // Reduce audience size by 15-30%
    const percent = Math.random() * 0.15 + 0.15; // 0.15 to 0.30
    setBattlegroundReduction(1 - percent);
    // Generate red hexes
    setRedHexes(generateRedHexes(10));
  };

  const handleAudienceToggle = (audience) => {
    setSelectedAudiences(prev => {
      if (prev.includes(audience)) {
        return prev.filter(a => a !== audience);
      }
      return [...prev, audience];
    });
  };

  // Calculate total audience size based on selections and logic
  const calculateTotalAudience = () => {
    let base;
    if (constructionMode === 'validation') {
      base = Math.round(minAudience + (maxAudience - minAudience) * (primaryScale / 100));
    } else if (selectedAudiences.length === 0) {
      base = 0;
    } else if (selectedAudiences.length === 1) {
      base = selectedAudiences[0] === 'primary' 
        ? Math.round(minAudience + (maxAudience - minAudience) * (primaryScale / 100))
        : Math.round(minAudience + (maxAudience - minAudience) * (secondaryScale / 100) * 0.6);
    } else {
      const primarySize = Math.round(minAudience + (maxAudience - minAudience) * (primaryScale / 100));
      const secondarySize = Math.round(minAudience + (maxAudience - minAudience) * (secondaryScale / 100) * 0.6);
      base = audienceLogic === 'and' 
        ? Math.round(primarySize * 0.7) // AND: 70% overlap
        : Math.round(primarySize + secondarySize * 0.3); // OR: 30% overlap
    }
    if (battlegroundCard && battlegroundReduction) {
      return Math.round(base * battlegroundReduction);
    }
    return base;
  };

  const handleSelectAllSpots = (e) => {
    if (e.target.checked) {
      setSelectedSpots(mockLinearSpots.map((_, idx) => idx));
    } else {
      setSelectedSpots([]);
    }
  };

  const handleSelectSpot = (idx) => {
    setSelectedSpots((prev) =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      {/* Top-level insight tabs above everything */}
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', borderBottom: '1px solid #e0e0e0', mb: 0 }}>
        <ToggleButtonGroup
          value={insightTab}
          exclusive
          onChange={(_, v) => v && setInsightTab(v)}
          sx={{
            alignSelf: 'flex-start',
            maxWidth: 380,
            height: 36,
            borderRadius: 2,
            boxShadow: 'none',
            minWidth: 0,
          }}
        >
          <ToggleButton value="location" sx={{
            textTransform: 'none',
            fontWeight: 400,
            fontSize: 13,
            px: 2,
            py: 0.5,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: insightTab === 'location' ? '#f5faff' : 'transparent',
            color: 'text.primary',
            '&.Mui-selected': {
              bgcolor: '#f5faff',
              color: 'primary.main',
            },
            '&:hover': {
              bgcolor: '#f5faff',
            },
            border: 'none',
            boxShadow: 'none',
          }}>
            <PlaceIcon sx={{ fontSize: 16, mr: 0.5 }} /> Location Insight
          </ToggleButton>
          <ToggleButton value="tv" sx={{
            textTransform: 'none',
            fontWeight: 400,
            fontSize: 13,
            px: 2,
            py: 0.5,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: insightTab === 'tv' ? '#f5faff' : 'transparent',
            color: 'text.primary',
            '&.Mui-selected': {
              bgcolor: '#f5faff',
              color: 'primary.main',
            },
            '&:hover': {
              bgcolor: '#f5faff',
            },
            border: 'none',
            boxShadow: 'none',
          }}>
            <LiveTvIcon sx={{ fontSize: 16, mr: 0.5 }} /> TV Spot Insight
          </ToggleButton>
        </ToggleButtonGroup>
        <Box sx={{ flex: 1 }} />
      </Box>
      <Box sx={{ height: 8 }} />
      {insightTab === 'location' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: '320px 1fr', gridTemplateRows: '1fr', width: '100%', height: '100%' }}>
          {/* Left column with insight tabs and then POI tabs */}
          <Box sx={{ gridColumn: 1, gridRow: 1, width: 320, minWidth: 320, maxWidth: 320, borderRight: `1px solid #e0e0e0`, pr: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', height: '100%', zIndex: 2, background: '#fff', overflowY: 'auto' }}>
            {/* Show location insight (current) or TV spot insight */}
            {insightTab === 'location' ? (
              <>
                {/* Tabs */}
                <Tabs
                  value={tab}
                  onChange={(_, v) => setTab(v)}
                  variant="fullWidth"
                  sx={{ mb: 0, minHeight: 28, height: 28, width: '100%', justifyContent: 'center', borderBottom: '1px solid #e0e0e0' }}
                  TabIndicatorProps={{
                    style: {
                      background: '#009fe3',
                      height: 3,
                      borderRadius: 2,
                    }
                  }}
                >
                  <Tab label="POI" value="POI" sx={{ fontSize: 11, minHeight: 28, height: 28, px: 0.5, py: 0, m: 0, flex: 1, textTransform: 'none' }} />
                  <Tab label="Locations" value="GEO" sx={{ fontSize: 12, minHeight: 28, height: 28, px: 0.5, py: 0, m: 0, flex: 1, textTransform: 'none' }} />
                  <Tab label="Battlegrounds" value="BATTLEGROUND" sx={{ fontSize: 12, minHeight: 28, height: 28, px: 0.5, py: 0, m: 0, flex: 1, textTransform: 'none' }} />
                </Tabs>
                {/* Margin below tabs where search bar was */}
                <Box sx={{ height: 12 }} />
                {/* POI Tab: Add Layer and POI Cards */}
                {tab === 'POI' && (
                  <Box sx={{ width: '90%', mx: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={handleAddLayerClick}
                      sx={{ my: 2, textTransform: 'none', fontWeight: 600, borderRadius: 2, borderColor: '#1976d2', color: '#1976d2', '&:hover': { borderColor: '#1976d2', background: '#e3f0fa' }, width: '100%' }}
                    >
                      Add Layer
                    </Button>
                    {layers.filter(layer => !layer.type).map((layer, idx) => (
                      <Card key={idx} sx={{ display: 'flex', alignItems: 'center', p: 1, boxShadow: 'none', borderLeft: 0, borderRight: 0, borderTop: 0, borderBottom: '1px solid #e0e0e0', borderRadius: 0, width: '100%', minHeight: 48, position: 'relative' }}>
                        <Avatar sx={{ bgcolor: 'transparent', width: 20, height: 20, mr: 1.5 }}>
                          <RoomIcon sx={{ color: layer.color, fontSize: 22 }} />
                        </Avatar>
                        <Box sx={{ flex: 1, textAlign: 'left' }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{layer.name}</Typography>
                          <Typography variant="body2" color="text.secondary">{layer.stores} Stores</Typography>
                        </Box>
                        <IconButton size="small" onClick={() => handleRemoveLayer(idx)} sx={{ ml: 1, position: 'absolute', right: 8, top: 8 }}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Card>
                    ))}
                  </Box>
                )}
                {/* Locations Tab: Add Layer, Type dropdown, TV region dropdown */}
                {tab === 'GEO' && (
                  <Box sx={{ width: '90%', mx: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={handleAddLayerClick}
                      sx={{ my: 2, textTransform: 'none', fontWeight: 600, borderRadius: 2, borderColor: '#1976d2', color: '#1976d2', '&:hover': { borderColor: '#1976d2', background: '#e3f0fa' }, width: '100%' }}
                    >
                      Add Layer
                    </Button>
                    {layers.filter(layer => layer.type).map((layer, idx) => (
                      <Card key={idx} sx={{ display: 'flex', alignItems: 'center', p: 1, boxShadow: 'none', borderLeft: 0, borderRight: 0, borderTop: 0, borderBottom: '1px solid #e0e0e0', borderRadius: 0, width: '100%', minHeight: 48, position: 'relative' }}>
                        <Box sx={{ flex: 1, textAlign: 'left' }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{layer.name}</Typography>
                          <Typography variant="body2" color="text.secondary">{layer.type}</Typography>
                        </Box>
                        <IconButton size="small" onClick={() => handleRemoveLayer(idx)} sx={{ ml: 1, position: 'absolute', right: 8, top: 8 }}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Card>
                    ))}
                  </Box>
                )}
                {/* Add Layer Menu */}
                <Menu
                  anchorEl={poiAnchorEl}
                  open={Boolean(poiAnchorEl)}
                  onClose={handlePoiMenuClose}
                  PaperProps={{
                    sx: {
                      width: '90%',
                      maxWidth: 280,
                      bgcolor: '#f7f7f7',
                      p: 2,
                      borderRadius: 1,
                      mt: 0.5,
                    }
                  }}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                  }}
                >
                  {tab === 'POI' ? (
                    <>
                      <FormControl fullWidth size="small" sx={{ mb: 2, bgcolor: 'white', borderRadius: 1 }}>
                        <InputLabel>Category</InputLabel>
                        <Select
                          value={category}
                          label="Category"
                          onChange={e => setCategory(e.target.value)}
                        >
                          {CATEGORY_OPTIONS.map(opt => (
                            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl fullWidth size="small" sx={{ mb: 2, bgcolor: 'white', borderRadius: 1 }}>
                        <InputLabel>Name</InputLabel>
                        <Select
                          value={name}
                          label="Name"
                          onChange={e => setName(e.target.value)}
                        >
                          {NAME_OPTIONS.map(opt => (
                            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button
                        variant="contained"
                        onClick={() => {
                          handleAddLayer();
                          handlePoiMenuClose();
                        }}
                        sx={{ width: '100%', textTransform: 'none' }}
                      >
                        Add
                      </Button>
                    </>
                  ) : (
                    <>
                      <FormControl fullWidth size="small" sx={{ mb: 2, bgcolor: 'white', borderRadius: 1 }}>
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={locationType}
                          label="Type"
                          onChange={e => setLocationType(e.target.value)}
                        >
                          <MenuItem value="TV region">TV region</MenuItem>
                          <MenuItem value="City">City</MenuItem>
                        </Select>
                      </FormControl>
                      {locationType === 'TV region' && (
                        <FormControl fullWidth size="small" sx={{ mb: 2, bgcolor: 'white', borderRadius: 1 }}>
                          <InputLabel>TV Region</InputLabel>
                          <Select
                            value={selectedRegion}
                            label="TV Region"
                            onChange={e => setSelectedRegion(e.target.value)}
                          >
                            {TV_REGIONS.map(region => (
                              <MenuItem key={region} value={region}>{region}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                      <Button
                        variant="contained"
                        onClick={() => {
                          handleAddLocation();
                          handlePoiMenuClose();
                        }}
                        sx={{ width: '100%', textTransform: 'none' }}
                      >
                        Add
                      </Button>
                    </>
                  )}
                </Menu>
                {/* Battlegrounds Tab: List battlegrounds, no popup */}
                {tab === 'BATTLEGROUND' && (
                  <Box sx={{ width: '90%', mx: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => setBattlegroundDialogOpen(true)}
                      sx={{ my: 2, textTransform: 'none', fontWeight: 600, borderRadius: 2, borderColor: '#1976d2', color: '#1976d2', '&:hover': { borderColor: '#1976d2', background: '#e3f0fa' }, width: '100%' }}
                    >
                      Define Battleground
                    </Button>
                    {/* Only show the card if battlegroundCard is set */}
                    {battlegroundCard && (
                      <Card sx={{ boxShadow: 'none', borderTop: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', borderLeft: 0, borderRight: 0, borderRadius: 0, width: '100%', mt: 2, p: 2, display: 'flex', flexDirection: 'row', alignItems: 'flex-start', position: 'relative' }}>
                        {/* Red hex icon */}
                        <Box sx={{ display: 'flex', alignItems: 'center', pr: 2, pt: 0.5 }}>
                          <svg width={28} height={28} viewBox="0 0 28 28">
                            <polygon points="14,3 25,10 25,21 14,27 3,21 3,10" fill="#E53935" stroke="#B71C1C" strokeWidth={1.5} opacity={0.7} />
                          </svg>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: 15, flex: 1 }}>Battlegrounds</Typography>
                            <IconButton size="small" onClick={() => setBattlegroundCard(null)} sx={{ ml: 1 }}>
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>Zone Type:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500, textTransform: 'capitalize' }}>
                              {battlegroundCard.zoneType === 'postcode' ? 'Postcode District' : 'Hex Grid (H3)'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>Score:</Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{battlegroundCard.score}</Typography>
                          </Box>
                        </Box>
                      </Card>
                    )}
                  </Box>
                )}
              </>
            ) : (
              <Box sx={{ width: '100%', px: 0, pt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 18 }}>Top TV Spots</Typography>
                  </Box>
                  <Box>
                    <button
                      style={{
                        background: '#fff',
                        color: '#009fe3',
                        border: '1px solid #009fe3',
                        borderRadius: 4,
                        padding: '4px 14px',
                        fontWeight: 500,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: 'none',
                        transition: 'background 0.15s',
                      }}
                    >
                      <DownloadIcon sx={{ fontSize: 17, mr: 1 }} /> Export TV plan
                    </button>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 14 }}>
                    These are the TV spots that over-index with your selected audience.
                  </Typography>
                  <Tooltip title={"We combine ACR and panel viewership data to identify TV spots that over-index with your selected audience. To export a CSV of the plan, select the spots you want and click 'Export'."} placement="right" arrow>
                    <InfoOutlinedIcon sx={{ color: '#bdbdbd', fontSize: 18, cursor: 'pointer', mt: 0.1 }} />
                  </Tooltip>
                </Box>
                <Box sx={{ width: '100%' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#fff', borderRadius: 6, overflow: 'hidden' }}>
                    <thead>
                      <tr style={{ background: '#f7f7fa', fontWeight: 600 }}>
                        <th style={{ padding: '8px 8px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', width: 36 }}>
                          <input type="checkbox" checked={allChecked} onChange={handleSelectAllSpots} style={{ cursor: 'pointer', accentColor: '#009fe3' }} />
                        </th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0', fontSize: 13 }}>Channel</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0', fontSize: 13 }}>Programme</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0', fontSize: 13 }}>Time Band</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e0e0e0', fontSize: 13 }}>Index</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e0e0e0', fontSize: 13 }}>Impressions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockLinearSpots.map((row, idx) => (
                        <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f7f7fa' }}>
                          <td style={{ padding: '7px 8px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={selectedSpots.includes(idx)}
                              onChange={() => handleSelectSpot(idx)}
                              style={{ cursor: 'pointer', accentColor: '#009fe3' }}
                            />
                          </td>
                          <td style={{ padding: '7px 12px', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>{row.channel}</td>
                          <td style={{ padding: '7px 12px', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>{row.programme}</td>
                          <td style={{ padding: '7px 12px', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>{row.timeBand}</td>
                          <td style={{ padding: '7px 12px', textAlign: 'right', borderBottom: '1px solid #f0f0f0', fontWeight: 600, fontSize: 13 }}>{row.indexScore}</td>
                          <td style={{ padding: '7px 12px', textAlign: 'right', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>{row.impressions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              </Box>
            )}
          </Box>
          {/* Right column: map full width, audience size box top left, smaller */}
          <Box sx={{ gridColumn: 2, gridRow: 1, minWidth: 0, height: 600, width: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', m: 0, p: 0, zIndex: 1 }}>
            {/* Static image map background changes based on audience selection */}
            <img
              src={
                selectedAudiences.length === 0
                  ? '/blankmap.png'
                  : selectedAudiences.length === 2
                    ? (audienceLogic === 'and' ? '/mapsecondary.png' : '/mapboth.png')
                    : selectedAudiences[0] === 'primary'
                      ? '/mapprimary.png'
                      : '/mapsecondary.png'
              }
              alt="Map"
              style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
            />
            {/* POI pins */}
            {tab === 'POI' && mapType === 'POI' && layers.map((layer, lidx) =>
              layer.type === 'TV region' ? null : layer.pins.map((pin, pidx) => (
                <RoomIcon
                  key={lidx + '-' + pidx}
                  sx={{
                    color: layer.color,
                    position: 'absolute',
                    left: `${pin.x}%`,
                    top: `${pin.y}%`,
                    fontSize: 22,
                    zIndex: 2,
                    transform: 'translate(-50%, -100%)',
                    pointerEvents: 'none',
                    opacity: 0.85,
                  }}
                />
              ))
            )}
            {/* Red hexes for battlegrounds */}
            {battlegroundCard && redHexes.map((hex, idx) => (
              <svg
                key={idx}
                width={96}
                height={96}
                viewBox="0 0 96 96"
                style={{
                  position: 'absolute',
                  left: `${hex.x}%`,
                  top: `${hex.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 3,
                  pointerEvents: 'none'
                }}
              >
                <polygon
                  points="48,12 84,36 84,72 48,96 12,72 12,36"
                  fill="#E53935"
                  stroke="#B71C1C"
                  strokeWidth={4}
                  opacity={0.45}
                />
              </svg>
            ))}
            {/* Audience size box top right */}
            <Box sx={{ position: 'absolute', right: 20, top: 12, bgcolor: '#fff', border: '1px solid #bdbdbd', borderRadius: 1, p: 1.5, minWidth: 200, boxShadow: 1, zIndex: 10 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: 10 }}>Audience Size:</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary', fontSize: 13 }}>{calculateTotalAudience().toLocaleString()}</Typography>
                <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0.5 }}>
                  <KeyboardArrowDownIcon fontSize="small" />
                </IconButton>
              </Box>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                PaperProps={{
                  sx: { width: 420, p: 1, mt: 0.5 }
                }}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Card sx={{ p: 1.5, boxShadow: 'none', border: '1px solid #eee', borderRadius: 1 }}>
                    <FormControlLabel
                      control={<Checkbox checked={selectedAudiences.includes('primary')} onChange={(e) => handleAudienceToggle('primary')} />}
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={600}>Primary Audience</Typography>
                          <Typography variant="caption" color="text.secondary">Families with kids over 11</Typography>
                          <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>
                            {Math.round(minAudience + (maxAudience - minAudience) * (primaryScale / 100)).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </Card>
                  {constructionMode !== 'validation' && <>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: 0.5 }}>
                      <ToggleButtonGroup
                        value={audienceLogic}
                        exclusive
                        onChange={(e, v) => v && setAudienceLogic(v)}
                        size="small"
                        disabled={selectedAudiences.length < 2}
                        sx={{ opacity: selectedAudiences.length < 2 ? 0.5 : 1 }}
                      >
                        <ToggleButton value="and">AND</ToggleButton>
                        <ToggleButton value="or">OR</ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                    <Card sx={{ p: 1.5, boxShadow: 'none', border: '1px solid #eee', borderRadius: 1 }}>
                      <FormControlLabel
                        control={<Checkbox checked={selectedAudiences.includes('secondary')} onChange={(e) => handleAudienceToggle('secondary')} />}
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight={600}>Secondary Audience</Typography>
                            <Typography variant="caption" color="text.secondary">Shopper habits</Typography>
                            <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>
                              {Math.round(minAudience + (maxAudience - minAudience) * (secondaryScale / 100) * 0.6).toLocaleString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </Card>
                  </>}
                </Box>
              </Menu>
            </Box>
          </Box>
        </Box>
      ) : (
        <Box sx={{ width: '100%', px: 0, pt: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 18 }}>Top TV Spots</Typography>
            </Box>
            <Box>
              <button
                style={{
                  background: '#fff',
                  color: '#009fe3',
                  border: '1px solid #009fe3',
                  borderRadius: 4,
                  padding: '4px 14px',
                  fontWeight: 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: 'none',
                  transition: 'background 0.15s',
                }}
              >
                <DownloadIcon sx={{ fontSize: 17, mr: 1 }} /> Export TV plan
              </button>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 14 }}>
              These are the TV spots that over-index with your selected audience.
            </Typography>
            <Tooltip title={"We combine ACR and panel viewership data to identify TV spots that over-index with your selected audience. To export a CSV of the plan, select the spots you want and click 'Export'."} placement="right" arrow>
              <InfoOutlinedIcon sx={{ color: '#bdbdbd', fontSize: 18, cursor: 'pointer', mt: 0.1 }} />
            </Tooltip>
          </Box>
          <Box sx={{ width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#fff', borderRadius: 6, overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#f7f7fa', fontWeight: 600 }}>
                  <th style={{ padding: '8px 8px', textAlign: 'center', borderBottom: '1px solid #e0e0e0', width: 36 }}>
                    <input type="checkbox" checked={allChecked} onChange={handleSelectAllSpots} style={{ cursor: 'pointer', accentColor: '#009fe3' }} />
                  </th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0', fontSize: 13 }}>Channel</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0', fontSize: 13 }}>Programme</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0', fontSize: 13 }}>Time Band</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e0e0e0', fontSize: 13 }}>Index</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e0e0e0', fontSize: 13 }}>Impressions</th>
                </tr>
              </thead>
              <tbody>
                {mockLinearSpots.map((row, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f7f7fa' }}>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedSpots.includes(idx)}
                        onChange={() => handleSelectSpot(idx)}
                        style={{ cursor: 'pointer', accentColor: '#009fe3' }}
                      />
                    </td>
                    <td style={{ padding: '7px 12px', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>{row.channel}</td>
                    <td style={{ padding: '7px 12px', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>{row.programme}</td>
                    <td style={{ padding: '7px 12px', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>{row.timeBand}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', borderBottom: '1px solid #f0f0f0', fontWeight: 600, fontSize: 13 }}>{row.indexScore}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>{row.impressions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Box>
      )}
      {/* Define Battleground Dialog */}
      <Dialog
        open={battlegroundDialogOpen}
        onClose={() => setBattlegroundDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 0, px: 4, pt: 3 }}>Define Battleground Zones</DialogTitle>
        <DialogContent sx={{ px: 4, mx: 2, py: 2 }}>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Zone Type Button Group */}
            <Box sx={{ py: 2 }}>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>Zone Type</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {[
                  { label: 'Postcode District', value: 'postcode' },
                  { label: 'Hex Grid (H3)', value: 'hex' }
                ].map(opt => (
                  <Button
                    key={opt.value}
                    variant={battlegroundForm.zone_type === opt.value ? 'contained' : 'outlined'}
                    onClick={() => handleBattlegroundFormChange('zone_type', opt.value)}
                    sx={{ textTransform: 'none', fontWeight: 500, borderRadius: 2 }}
                  >
                    {opt.label}
                  </Button>
                ))}
              </Box>
            </Box>
            <Divider sx={{ my: 0 }} />
            {/* Stepper for Minimum Total Stores */}
            <Box sx={{ py: 2 }}>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>Minimum Total Stores Required</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleBattlegroundFormChange('min_total_stores', Math.max(1, battlegroundForm.min_total_stores - 1))}
                  disabled={battlegroundForm.min_total_stores <= 1}
                  sx={{ minWidth: 32, px: 0 }}
                >
                  -
                </Button>
                <TextField
                  type="number"
                  value={battlegroundForm.min_total_stores}
                  onChange={e => {
                    let v = parseInt(e.target.value);
                    if (isNaN(v)) v = 1;
                    v = Math.max(1, Math.min(10, v));
                    handleBattlegroundFormChange('min_total_stores', v);
                  }}
                  inputProps={{ min: 1, max: 10, style: { width: 40, textAlign: 'center' } }}
                  size="small"
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleBattlegroundFormChange('min_total_stores', Math.min(10, battlegroundForm.min_total_stores + 1))}
                  disabled={battlegroundForm.min_total_stores >= 10}
                  sx={{ minWidth: 32, px: 0 }}
                >
                  +
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Zones must contain at least this many combined stores (yours + competitors) to be included.
              </Typography>
            </Box>
            <Divider sx={{ my: 0 }} />
            {/* Battleground Balance Slider */}
            <Box sx={{ py: 2 }}>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>Battleground Balance</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70, textAlign: 'left', pr: 1 }}>
                  Client-heavy
                </Typography>
                <Slider
                  value={battlegroundForm.balance_slider}
                  onChange={(_, value) => handleBattlegroundFormChange('balance_slider', value)}
                  min={0}
                  max={100}
                  step={1}
                  valueLabelDisplay="auto"
                  sx={{ flex: 1, mx: 1, height: 4 }}
                  size="small"
                />
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 90, textAlign: 'right', pl: 1 }}>
                  Competitor-heavy
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Choose the balance of store presence you want to highlight:
              </Typography>
            </Box>
            <Divider sx={{ my: 0 }} />
            {/* Client Presence Checkbox */}
            <Box sx={{ py: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={battlegroundForm.filter_client_presence}
                    onChange={e => handleBattlegroundFormChange('filter_client_presence', e.target.checked)}
                  />
                }
                label="Only include zones with at least one client store"
                sx={{ ml: 1 }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBattlegroundDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleApplyBattlegroundLogic}>
            Apply Battleground Logic
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AudienceStep4; 