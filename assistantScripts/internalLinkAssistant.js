// ==UserScript==
// @name         PCBStore Bulk Link Inserter
// @namespace    http://tampermonkey.net/
// @version      5.4.3
// @description  Bulk insert links into page text with brand quick-select buttons.
// @author       You
// @match        https://admin.pcbstore.net/admin/product
// @match        https://admin.pcbstore.net/admin/product/*
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  const BRANDS = [
    ["1MORE","https://pcbstore.com.bd/brand/1more"],["1STPLAYER","https://pcbstore.com.bd/brand/1stplayer"],
    ["70Mai","https://pcbstore.com.bd/brand/70mai"],["7Artisans","https://pcbstore.com.bd/brand/7artisans"],
    ["7Ryms","https://pcbstore.com.bd/brand/7ryms"],["8Bitdo","https://pcbstore.com.bd/brand/8bitdo"],
    ["A4Tech","https://pcbstore.com.bd/brand/a4tech"],["ACEFAST","https://pcbstore.com.bd/brand/acefast"],
    ["ACER","https://pcbstore.com.bd/brand/acer"],["ADATA","https://pcbstore.com.bd/brand/adata"],
    ["Addlink","https://pcbstore.com.bd/brand/addlink"],["Adobe","https://pcbstore.com.bd/brand/adobe"],
    ["Aigo","https://pcbstore.com.bd/brand/aigo"],["AJAZZ","https://pcbstore.com.bd/brand/ajazz"],
    ["AKG","https://pcbstore.com.bd/brand/akg"],["Amazfit","https://pcbstore.com.bd/brand/amazfit"],
    ["AMD","https://pcbstore.com.bd/brand/amd"],["Anker","https://pcbstore.com.bd/brand/anker"],
    ["ANTEC","https://pcbstore.com.bd/brand/antec"],["AOC","https://pcbstore.com.bd/brand/aoc"],
    ["Apacer","https://pcbstore.com.bd/brand/apacer"],["APC","https://pcbstore.com.bd/brand/apc"],
    ["Apple","https://pcbstore.com.bd/brand/apple"],["ARCTIC","https://pcbstore.com.bd/brand/arctic"],
    ["Arctic Hunter","https://pcbstore.com.bd/brand/arctic-hunter"],["ARESZE","https://pcbstore.com.bd/brand/aresze"],
    ["ASROCK","https://pcbstore.com.bd/brand/asrock"],["ASUS","https://pcbstore.com.bd/brand/asus"],
    ["Audio-Technica","https://pcbstore.com.bd/brand/audio-technica"],["AUKEY","https://pcbstore.com.bd/brand/aukey"],
    ["AULA","https://pcbstore.com.bd/brand/aula"],["Avermedia","https://pcbstore.com.bd/brand/avermedia"],
    ["AVITA","https://pcbstore.com.bd/brand/avita"],["Awei","https://pcbstore.com.bd/brand/awei"],
    ["BAJEAL","https://pcbstore.com.bd/brand/bajeal"],["Baseus","https://pcbstore.com.bd/brand/baseus"],
    ["Beats","https://pcbstore.com.bd/brand/beats"],["Belkin","https://pcbstore.com.bd/brand/belkin"],
    ["Benq","https://pcbstore.com.bd/brand/benq"],["Beyerdynamic","https://pcbstore.com.bd/brand/beyerdynamic"],
    ["Bigbigwon","https://pcbstore.com.bd/brand/bigbigwon"],["Bijoy","https://pcbstore.com.bd/brand/bijoy"],
    ["BIOSTAR","https://pcbstore.com.bd/brand/biostar"],["Bitdefender","https://pcbstore.com.bd/brand/bitdefender"],
    ["Bitfenix","https://pcbstore.com.bd/brand/bitfenix"],["Black Shark","https://pcbstore.com.bd/brand/black-shark"],
    ["Blackmagic","https://pcbstore.com.bd/brand/blackmagic-design"],["Bluetti","https://pcbstore.com.bd/brand/bluetti"],
    ["Bose","https://pcbstore.com.bd/brand/bose"],["Brother","https://pcbstore.com.bd/brand/brother"],
    ["Canon","https://pcbstore.com.bd/brand/canon"],["CASIO","https://pcbstore.com.bd/brand/casio"],
    ["Cisco","https://pcbstore.com.bd/brand/cisco"],["COLORFUL","https://pcbstore.com.bd/brand/colorful"],
    ["Comfast","https://pcbstore.com.bd/brand/comfast"],["COOLER MASTER","https://pcbstore.com.bd/brand/cooler-master"],
    ["CORSAIR","https://pcbstore.com.bd/brand/corsair"],["COUGAR","https://pcbstore.com.bd/brand/cougar"],
    ["CRUCIAL","https://pcbstore.com.bd/brand/crucial"],["Cudy","https://pcbstore.com.bd/brand/cudy"],
    ["D-Link","https://pcbstore.com.bd/brand/d-link"],["Dahua","https://pcbstore.com.bd/brand/dahua"],
    ["Daikin","https://pcbstore.com.bd/brand/daikin"],["Dareu","https://pcbstore.com.bd/brand/dareu"],
    ["DEEPCOOL","https://pcbstore.com.bd/brand/deepcool"],["Dell","https://pcbstore.com.bd/brand/dell"],
    ["Delux","https://pcbstore.com.bd/brand/delux"],["Denon","https://pcbstore.com.bd/brand/denon"],
    ["DJI","https://pcbstore.com.bd/brand/dji"],["DTECH","https://pcbstore.com.bd/brand/dtech"],
    ["Dxracer","https://pcbstore.com.bd/brand/dxracer"],["Dyson","https://pcbstore.com.bd/brand/dyson"],
    ["Earfun","https://pcbstore.com.bd/brand/earfun"],["Easysmx","https://pcbstore.com.bd/brand/easysmx"],
    ["Ecoflow","https://pcbstore.com.bd/brand/ecoflow"],["Edifier","https://pcbstore.com.bd/brand/edifier"],
    ["Elgato","https://pcbstore.com.bd/brand/elgato"],["EPSON","https://pcbstore.com.bd/brand/epson"],
    ["EVGA","https://pcbstore.com.bd/brand/evga"],["EZVIZ","https://pcbstore.com.bd/brand/ezviz"],
    ["FANTECH","https://pcbstore.com.bd/brand/fantech"],["FIFINE","https://pcbstore.com.bd/brand/fifine"],
    ["Fitbit","https://pcbstore.com.bd/brand/fitbit"],["Focusrite","https://pcbstore.com.bd/brand/focusrite"],
    ["FSP","https://pcbstore.com.bd/brand/fsp"],["Fujifilm","https://pcbstore.com.bd/brand/fujifilm"],
    ["Fujitsu","https://pcbstore.com.bd/brand/fujitsu"],["G.SKILL","https://pcbstore.com.bd/brand/gskill"],
    ["GAMDIAS","https://pcbstore.com.bd/brand/gamdias"],["Gamemax","https://pcbstore.com.bd/brand/gamemax"],
    ["Gamesir","https://pcbstore.com.bd/brand/gamesir"],["Genius","https://pcbstore.com.bd/brand/genius"],
    ["GIGABYTE","https://pcbstore.com.bd/brand/gigabyte"],["Glorious","https://pcbstore.com.bd/brand/glorious"],
    ["Godox","https://pcbstore.com.bd/brand/godox"],["Gopro","https://pcbstore.com.bd/brand/gopro"],
    ["Grandstream","https://pcbstore.com.bd/brand/grandstream"],["Gree","https://pcbstore.com.bd/brand/gree"],
    ["Haier","https://pcbstore.com.bd/brand/haier"],["Hamko","https://pcbstore.com.bd/brand/hamko"],
    ["Havit","https://pcbstore.com.bd/brand/havit"],["Haylou","https://pcbstore.com.bd/brand/haylou"],
    ["HIKVISION","https://pcbstore.com.bd/brand/hikvision"],["Hisense","https://pcbstore.com.bd/brand/hisense"],
    ["HOCO","https://pcbstore.com.bd/brand/hoco"],["Honeywell","https://pcbstore.com.bd/brand/honeywell"],
    ["HONOR","https://pcbstore.com.bd/brand/honor"],["HP","https://pcbstore.com.bd/brand/hp"],
    ["HUAWEI","https://pcbstore.com.bd/brand/huawei"],["Huion","https://pcbstore.com.bd/brand/huion"],
    ["HUNTKEY","https://pcbstore.com.bd/brand/huntkey"],["HyperX","https://pcbstore.com.bd/brand/hyperx"],
    ["HYTE","https://pcbstore.com.bd/brand/hyte"],["Imou","https://pcbstore.com.bd/brand/imou"],
    ["Infinix","https://pcbstore.com.bd/brand/infinix"],["INNO3D","https://pcbstore.com.bd/brand/inno3d"],
    ["INTECH","https://pcbstore.com.bd/brand/intech"],["INTEL","https://pcbstore.com.bd/brand/intel"],
    ["Jabra","https://pcbstore.com.bd/brand/jabra"],["JAMESDONKEY","https://pcbstore.com.bd/brand/jamesdonkey"],
    ["JBL","https://pcbstore.com.bd/brand/jbl"],["JOYROOM","https://pcbstore.com.bd/brand/joyroom"],
    ["Kaspersky","https://pcbstore.com.bd/brand/kaspersky"],["Keychron","https://pcbstore.com.bd/brand/keychron"],
    ["KINGSTON","https://pcbstore.com.bd/brand/kingston"],["Kingspec","https://pcbstore.com.bd/brand/kingspec"],
    ["Kioxia","https://pcbstore.com.bd/brand/kioxia"],["Klipsch","https://pcbstore.com.bd/brand/klipsch"],
    ["Kodak","https://pcbstore.com.bd/brand/kodak"],["Lenovo","https://pcbstore.com.bd/brand/lenovo"],
    ["LEXAR","https://pcbstore.com.bd/brand/lexar"],["LG","https://pcbstore.com.bd/brand/lg"],
    ["LIAN LI","https://pcbstore.com.bd/brand/lian-li"],["Linksys","https://pcbstore.com.bd/brand/linksys"],
    ["Logitech","https://pcbstore.com.bd/brand/logitech"],["LUMINOUS","https://pcbstore.com.bd/brand/luminous"],
    ["MAONO","https://pcbstore.com.bd/brand/maono"],["Marshall","https://pcbstore.com.bd/brand/marshall"],
    ["MAXHUB","https://pcbstore.com.bd/brand/maxhub"],["Mcdodo","https://pcbstore.com.bd/brand/mcdodo"],
    ["Meetion","https://pcbstore.com.bd/brand/meetion"],["Mercury","https://pcbstore.com.bd/brand/mercury"],
    ["Mercusys","https://pcbstore.com.bd/brand/mercusys"],["Microsoft","https://pcbstore.com.bd/brand/microsoft"],
    ["Midea","https://pcbstore.com.bd/brand/midea"],["Mikrotik","https://pcbstore.com.bd/brand/mikrotik"],
    ["Montech","https://pcbstore.com.bd/brand/montech"],["MSI","https://pcbstore.com.bd/brand/msi"],
    ["MUST","https://pcbstore.com.bd/brand/must"],["Nikon","https://pcbstore.com.bd/brand/nikon"],
    ["Nintendo","https://pcbstore.com.bd/brand/nintendo"],["Noctua","https://pcbstore.com.bd/brand/noctua"],
    ["Nokia","https://pcbstore.com.bd/brand/nokia"],["Norton","https://pcbstore.com.bd/brand/norton"],
    ["Nothing","https://pcbstore.com.bd/brand/nothing"],["Nvidia","https://pcbstore.com.bd/brand/nvidia"],
    ["NZXT","https://pcbstore.com.bd/brand/nzxt"],["OCPC","https://pcbstore.com.bd/brand/ocpc"],
    ["Oneplus","https://pcbstore.com.bd/brand/oneplus"],["OPPO","https://pcbstore.com.bd/brand/oppo"],
    ["Optoma","https://pcbstore.com.bd/brand/optoma"],["ORICO","https://pcbstore.com.bd/brand/orico"],
    ["Panasonic","https://pcbstore.com.bd/brand/panasonic"],["Pantum","https://pcbstore.com.bd/brand/pantum"],
    ["Phanteks","https://pcbstore.com.bd/brand/phanteks"],["PHILIPS","https://pcbstore.com.bd/brand/philips"],
    ["PNY","https://pcbstore.com.bd/brand/pny"],["Polk Audio","https://pcbstore.com.bd/brand/polk-audio"],
    ["Poly","https://pcbstore.com.bd/brand/poly"],["PowerColor","https://pcbstore.com.bd/brand/powercolor"],
    ["Presonus","https://pcbstore.com.bd/brand/presonus"],["PROLINK","https://pcbstore.com.bd/brand/prolink"],
    ["Pulsar","https://pcbstore.com.bd/brand/pulsar"],["QCY","https://pcbstore.com.bd/brand/qcy"],
    ["QNAP","https://pcbstore.com.bd/brand/qnap"],["Rapoo","https://pcbstore.com.bd/brand/rapoo"],
    ["RAZER","https://pcbstore.com.bd/brand/razer"],["Realme","https://pcbstore.com.bd/brand/realme"],
    ["Redragon","https://pcbstore.com.bd/brand/redragon"],["Remax","https://pcbstore.com.bd/brand/remax"],
    ["RICOH","https://pcbstore.com.bd/brand/ricoh"],["RODE","https://pcbstore.com.bd/brand/rode"],
    ["ROYAL KLUDGE","https://pcbstore.com.bd/brand/royal-kludge"],["Ruijie","https://pcbstore.com.bd/brand/ruijie"],
    ["SABRENT","https://pcbstore.com.bd/brand/sabrent"],["Sades","https://pcbstore.com.bd/brand/sades"],
    ["Samsung","https://pcbstore.com.bd/brand/samsung"],["Sandisk","https://pcbstore.com.bd/brand/sandisk"],
    ["Sapphire","https://pcbstore.com.bd/brand/sapphire"],["Saramonic","https://pcbstore.com.bd/brand/saramonic"],
    ["Seagate","https://pcbstore.com.bd/brand/seagate"],["Seasonic","https://pcbstore.com.bd/brand/seasonic"],
    ["Secretlab","https://pcbstore.com.bd/brand/secretlab"],["Sennheiser","https://pcbstore.com.bd/brand/sennheiser"],
    ["SHARP","https://pcbstore.com.bd/brand/sharp"],["Shure","https://pcbstore.com.bd/brand/shure"],
    ["Silicon Power","https://pcbstore.com.bd/brand/silicon-power"],["SilverStone","https://pcbstore.com.bd/brand/silverstone"],
    ["Sk Hynix","https://pcbstore.com.bd/brand/sk-hynix"],["Skullcandy","https://pcbstore.com.bd/brand/skullcandy"],
    ["Sony","https://pcbstore.com.bd/brand/sony"],["Soundpeats","https://pcbstore.com.bd/brand/soundpeats"],
    ["SPC Gear","https://pcbstore.com.bd/brand/spc"],["Steelseries","https://pcbstore.com.bd/brand/steelseries"],
    ["Super Flower","https://pcbstore.com.bd/brand/super-flower"],["Synology","https://pcbstore.com.bd/brand/synology"],
    ["TCL","https://pcbstore.com.bd/brand/tcl"],["TEAM","https://pcbstore.com.bd/brand/team"],
    ["TECNO","https://pcbstore.com.bd/brand/tecno"],["Tenda","https://pcbstore.com.bd/brand/tenda"],
    ["Thermal Grizzly","https://pcbstore.com.bd/brand/thermal-grizzly"],["Thermalright","https://pcbstore.com.bd/brand/thermalright"],
    ["Thermaltake","https://pcbstore.com.bd/brand/thermaltake"],["Thunderobot","https://pcbstore.com.bd/brand/thunderobot"],
    ["TOSHIBA","https://pcbstore.com.bd/brand/toshiba"],["TOTOLINK","https://pcbstore.com.bd/brand/totolink"],
    ["Tp-Link","https://pcbstore.com.bd/brand/tp-link"],["Transcend","https://pcbstore.com.bd/brand/transcend"],
    ["Tribit","https://pcbstore.com.bd/brand/tribit"],["Tronmart","https://pcbstore.com.bd/brand/tronmart"],
    ["TwinMOS","https://pcbstore.com.bd/brand/twinmos"],["Ubiquiti","https://pcbstore.com.bd/brand/ubiquiti"],
    ["UGREEN","https://pcbstore.com.bd/brand/ugreen"],["UNITEK","https://pcbstore.com.bd/brand/unitek"],
    ["Value-Top","https://pcbstore.com.bd/brand/value-top"],["Vention","https://pcbstore.com.bd/brand/vention"],
    ["VGN","https://pcbstore.com.bd/brand/vgn"],["ViewSonic","https://pcbstore.com.bd/brand/viewsonic"],
    ["Viltrox","https://pcbstore.com.bd/brand/viltrox"],["Wacom","https://pcbstore.com.bd/brand/wacom"],
    ["Walton","https://pcbstore.com.bd/brand/walton"],["Wavlink","https://pcbstore.com.bd/brand/wavlink"],
    ["Western Digital","https://pcbstore.com.bd/brand/western-digital"],["WGP","https://pcbstore.com.bd/brand/wgp"],
    ["XIAOMI","https://pcbstore.com.bd/brand/xiaomi"],["XIGMATEK","https://pcbstore.com.bd/brand/xigmatek"],
    ["XP-PEN","https://pcbstore.com.bd/brand/xp-pen"],["Xpert","https://pcbstore.com.bd/brand/xpert"],
    ["XPG","https://pcbstore.com.bd/brand/xpg"],["Xprinter","https://pcbstore.com.bd/brand/xprinter"],
    ["Xtrike Me","https://pcbstore.com.bd/brand/xtrike-me"],["Yamaha","https://pcbstore.com.bd/brand/yamaha"],
    ["Yealink","https://pcbstore.com.bd/brand/yealink"],["YUNZII","https://pcbstore.com.bd/brand/yunzii"],
    ["ZADAK","https://pcbstore.com.bd/brand/zadak"],["Zebra","https://pcbstore.com.bd/brand/zebra"],
    ["Zhiyun-Tech","https://pcbstore.com.bd/brand/zhiyun-tech"],["Zkteco","https://pcbstore.com.bd/brand/zkteco"],
    ["ZOTAC","https://pcbstore.com.bd/brand/zotac"],["ZTE","https://pcbstore.com.bd/brand/zte"],
    ["Zyxel","https://pcbstore.com.bd/brand/zyxel"],
    // PC Components
    ["PC Components","https://pcbstore.com.bd/pc-components"],
    ["Processor","https://pcbstore.com.bd/pc-components/processor"],
    ["CPU Cooler","https://pcbstore.com.bd/pc-components/cpu-cooler"],
    ["CPU Liquid Cooler","https://pcbstore.com.bd/pc-components/cpu-liquid-cooler"],
    ["RAM Cooler","https://pcbstore.com.bd/pc-components/ram-cooler"],
    ["Motherboard","https://pcbstore.com.bd/pc-components/motherboard"],
    ["Desktop RAM","https://pcbstore.com.bd/pc-components/desktop-ram"],
    ["Graphics Card","https://pcbstore.com.bd/pc-components/graphics-card"],
    ["Vertical Graphics Card Holder","https://pcbstore.com.bd/pc-components/vertical-graphics-card-holder"],
    ["SSD","https://pcbstore.com.bd/pc-components/ssd"],
    ["Portable SSD","https://pcbstore.com.bd/pc-components/portable-ssd"],
    ["SSD Cooler","https://pcbstore.com.bd/pc-components/ssd-cooler"],
    ["Hard Disk Drive","https://pcbstore.com.bd/pc-components/hard-disk-drive"],
    ["Portable HDD","https://pcbstore.com.bd/pc-components/portable-hdd"],
    ["Power Supply","https://pcbstore.com.bd/pc-components/power-supply"],
    ["Casing","https://pcbstore.com.bd/pc-components/casing"],
    ["Casing Fan","https://pcbstore.com.bd/pc-components/casing-fan"],
    ["Custom Cooling Kit","https://pcbstore.com.bd/pc-components/custom-cooling-kit"],
    ["Optical Drive","https://pcbstore.com.bd/pc-components/optical-drive"],
    // Computer Accessories
    ["Keyboard","https://pcbstore.com.bd/accessories/keyboard"],
    ["Keyboard Mouse Combo","https://pcbstore.com.bd/accessories/keyboard-mouse-combo"],
    ["Mouse","https://pcbstore.com.bd/accessories/mouse"],
    ["Mouse Pad","https://pcbstore.com.bd/accessories/mouse-pad"],
    ["Mouse Bungee","https://pcbstore.com.bd/accessories/mouse-bungee"],
    ["Webcam","https://pcbstore.com.bd/accessories/webcam"],
    ["Card Reader","https://pcbstore.com.bd/accessories/card-reader"],
    ["HDD Enclosure","https://pcbstore.com.bd/accessories/hdd-enclosure"],
    ["SSD Enclosure","https://pcbstore.com.bd/accessories/ssd-enclosure"],
    ["Pen Drive","https://pcbstore.com.bd/accessories/pen-drive"],
    ["Memory Card","https://pcbstore.com.bd/accessories/memory-card"],
    ["Headphone","https://pcbstore.com.bd/accessories/headphone"],
    ["Headphone Stand","https://pcbstore.com.bd/accessories/headphone-stand"],
    ["Microphone","https://pcbstore.com.bd/accessories/microphone"],
    ["Microphone Stand","https://pcbstore.com.bd/accessories/microphone-stand"],
    ["ARGB Controller","https://pcbstore.com.bd/accessories/argb-controller"],
    ["Capture Card","https://pcbstore.com.bd/accessories/capture-card"],
    ["Power Strip","https://pcbstore.com.bd/accessories/power-strip"],
    ["USB Hub","https://pcbstore.com.bd/accessories/usb-hub"],
    ["Hubs & Docks","https://pcbstore.com.bd/accessories/hubs-and-docks"],
    ["Converter and Splitters","https://pcbstore.com.bd/accessories/converter-and-splitters"],
    ["Expansion Card","https://pcbstore.com.bd/accessories/expansion-card"],
    ["Bluetooth Adapter","https://pcbstore.com.bd/accessories/bluetooth-adapter"],
    ["Thermal Pastes","https://pcbstore.com.bd/accessories/thermal-pastes"],
    ["Thermal Pad","https://pcbstore.com.bd/accessories/thermal-pad"],
    ["Cable","https://pcbstore.com.bd/accessories/cable"],
    ["Wrist Rest","https://pcbstore.com.bd/accessories/wrist-rest"],
    // Laptop
    ["All Laptop","https://pcbstore.com.bd/laptop/all-laptop"],
    ["Laptop RAM","https://pcbstore.com.bd/laptop/laptop-ram"],
    ["Laptop Accessories","https://pcbstore.com.bd/laptop/laptop-accessories"],
    // Gaming
    ["Gaming Chair","https://pcbstore.com.bd/gaming/gaming-chair"],
    ["Gaming Console","https://pcbstore.com.bd/gaming/gaming-console"],
    ["Gaming Desk","https://pcbstore.com.bd/gaming/gaming-desk"],
    ["VR","https://pcbstore.com.bd/gaming/vr"],
    ["Gamepad","https://pcbstore.com.bd/gaming/gamepad"],
    ["Gaming Sofa","https://pcbstore.com.bd/gaming/gaming-sofa"],
    ["Gaming Headphone","https://pcbstore.com.bd/gaming/gaming-headphone"],
    ["Gaming Keyboard","https://pcbstore.com.bd/gaming/gaming-keyboard"],
    ["Gaming Mouse","https://pcbstore.com.bd/gaming/gaming-mouse"],
    // Monitor
    ["Monitor","https://pcbstore.com.bd/monitor"],
    ["All Monitor","https://pcbstore.com.bd/monitor/all-monitor"],
    ["Monitor Arm","https://pcbstore.com.bd/monitor/monitor-arm"],
    ["Interactive Flat Panel","https://pcbstore.com.bd/monitor/interactive-flat-panel"],
    ["Monitor Light","https://pcbstore.com.bd/monitor/monitor-light"],
    // Gadget
    ["Gadget","https://pcbstore.com.bd/gadget"],
    ["Smart Watch","https://pcbstore.com.bd/gadget/smart-watch"],
    ["Apple Watch","https://pcbstore.com.bd/gadget/apple-watch"],
    ["Smart Band","https://pcbstore.com.bd/gadget/smart-band"],
    ["Calculator","https://pcbstore.com.bd/gadget/calculator"],
    ["Car Accessories","https://pcbstore.com.bd/gadget/car-accessories"],
    ["Electric Toothbrush","https://pcbstore.com.bd/gadget/electric-toothbrush"],
    ["Gimbal","https://pcbstore.com.bd/gadget/gimbal"],
    ["Backpack","https://pcbstore.com.bd/gadget/backpack"],
    ["Power Bank","https://pcbstore.com.bd/gadget/power-bank"],
    ["Smart Glasses","https://pcbstore.com.bd/gadget/smart-glasses"],
    ["Mini Fan","https://pcbstore.com.bd/gadget/mini-fan"],
    ["Smart Ring","https://pcbstore.com.bd/gadget/smart-ring"],
    ["Studio Equipment","https://pcbstore.com.bd/gadget/studio-equipment"],
    ["Drone","https://pcbstore.com.bd/gadget/drone"],
    ["Trimmer","https://pcbstore.com.bd/gadget/trimmer"],
    ["Stream Deck","https://pcbstore.com.bd/gadget/stream-deck"],
    // Audio
    ["Music Player","https://pcbstore.com.bd/audio/music-player"],
    ["Sound Card","https://pcbstore.com.bd/audio/sound-card"],
    ["Voice Recorder","https://pcbstore.com.bd/audio/voice-recorder"],
    ["Radio","https://pcbstore.com.bd/audio/radio"],
    ["Musical Instrument","https://pcbstore.com.bd/audio/musical-instrument"],
    ["Sound System Accessories","https://pcbstore.com.bd/audio/sound-system-accessories"],
    ["Bluetooth Speaker","https://pcbstore.com.bd/audio/bluetooth-speaker"],
    ["TWS","https://pcbstore.com.bd/audio/tws"],
    ["Bluetooth Headphone","https://pcbstore.com.bd/audio/bluetooth-headphone"],
    ["Earphone","https://pcbstore.com.bd/audio/earphone"],
    ["Speaker","https://pcbstore.com.bd/audio/speaker"],
    ["Airpods","https://pcbstore.com.bd/audio/airpods"],
    ["Earbuds","https://pcbstore.com.bd/audio/earbuds"],
    ["Neckband","https://pcbstore.com.bd/audio/neckband"],
    ["Home Theater Systems","https://pcbstore.com.bd/audio/home-theater-systems"],
    ["Amplifier","https://pcbstore.com.bd/audio/amplifier"],
    // Home Appliance
    ["TV","https://pcbstore.com.bd/home-appliance/television"],
    ["Refrigerator","https://pcbstore.com.bd/home-appliance/refrigerator"],
    ["Washing Machine","https://pcbstore.com.bd/home-appliance/washing-machine"],
    ["Air Conditioner","https://pcbstore.com.bd/home-appliance/air-conditioner"],
    ["Fan","https://pcbstore.com.bd/home-appliance/fan"],
    ["Sewing Machine","https://pcbstore.com.bd/home-appliance/sewing-machine"],
    ["Air Purifier","https://pcbstore.com.bd/home-appliance/air-purifier"],
    ["Air Cooler","https://pcbstore.com.bd/home-appliance/air-cooler"],
    ["Air Fryer","https://pcbstore.com.bd/home-appliance/air-fryer"],
    ["Vacuum Cleaner","https://pcbstore.com.bd/home-appliance/vacuum-cleaner"],
    ["Oven","https://pcbstore.com.bd/home-appliance/oven"],
    ["Blender","https://pcbstore.com.bd/home-appliance/blender"],
    ["Geyser","https://pcbstore.com.bd/home-appliance/geyser-water-heater"],
    ["Room Heater","https://pcbstore.com.bd/home-appliance/room-heater"],
    ["Electric Kettle","https://pcbstore.com.bd/home-appliance/electric-kettle"],
    ["Cooker","https://pcbstore.com.bd/home-appliance/cooker"],
    ["Iron","https://pcbstore.com.bd/home-appliance/iron"],
    ["Blower Machine","https://pcbstore.com.bd/home-appliance/blower-machine"],
    ["Weight Scale","https://pcbstore.com.bd/home-appliance/weight-scale"],
    ["Hair Dryer","https://pcbstore.com.bd/home-appliance/hair-dryer"],
    ["TV Accessories","https://pcbstore.com.bd/home-appliance/tv-accessories"],
    ["Smart LED Bulbs","https://pcbstore.com.bd/home-appliance/smart-led-bulbs"],
    // UPS IPS & Power Solutions
    ["Voltage Stabilizer","https://pcbstore.com.bd/ups-ips-power-solutions/voltage-stabilizer"],
    ["UPS","https://pcbstore.com.bd/ups-ips-power-solutions/ups"],
    ["Online UPS","https://pcbstore.com.bd/ups-ips-power-solutions/online-ups"],
    ["Mini UPS","https://pcbstore.com.bd/ups-ips-power-solutions/mini-ups"],
    ["Portable Power Station","https://pcbstore.com.bd/ups-ips-power-solutions/portable-power-station"],
    ["IPS","https://pcbstore.com.bd/ups-ips-power-solutions/ips"],
    ["UPS Battery","https://pcbstore.com.bd/ups-ips-power-solutions/ups-battery"],
    // Office Equipment
    ["Printer","https://pcbstore.com.bd/office-equipment/printer"],
    ["Laser Printer","https://pcbstore.com.bd/office-equipment/laser-printer"],
    ["POS Printer","https://pcbstore.com.bd/office-equipment/pos-printer"],
    ["Scanner","https://pcbstore.com.bd/office-equipment/scanner"],
    ["Ink Bottle","https://pcbstore.com.bd/office-equipment/ink-bottle"],
    ["Toner","https://pcbstore.com.bd/office-equipment/toner"],
    ["Cartridge","https://pcbstore.com.bd/office-equipment/cartridge"],
    ["Printer Paper","https://pcbstore.com.bd/office-equipment/print-paper"],
    ["Printer Head","https://pcbstore.com.bd/office-equipment/printer-head"],
    ["Ribbon Printer","https://pcbstore.com.bd/office-equipment/ribbon-printer"],
    ["Dot Matrix Printer","https://pcbstore.com.bd/office-equipment/dot-matrix-printer"],
    ["Large Format Printer","https://pcbstore.com.bd/office-equipment/large-format-printer"],
    ["ID Card Printer","https://pcbstore.com.bd/office-equipment/id-card-printer"],
    ["Label Printer","https://pcbstore.com.bd/office-equipment/label-printer"],
    ["Photocopier","https://pcbstore.com.bd/office-equipment/photocopier"],
    ["Barcode Scanner","https://pcbstore.com.bd/office-equipment/barcode-scanner"],
    ["Drum Scanner","https://pcbstore.com.bd/office-equipment/drum-scanner"],
    ["Projector","https://pcbstore.com.bd/office-equipment/projector"],
    ["Conference System","https://pcbstore.com.bd/office-equipment/conference-system"],
    ["PA System","https://pcbstore.com.bd/office-equipment/pa-system"],
    ["Attendance Machine","https://pcbstore.com.bd/office-equipment/attendence-machine"],
    ["Telephone Set","https://pcbstore.com.bd/office-equipment/telephone-set"],
    ["IP Phone","https://pcbstore.com.bd/office-equipment/ip-phone"],
    ["PABX System","https://pcbstore.com.bd/office-equipment/pabx-system"],
    ["Fax Machine","https://pcbstore.com.bd/office-equipment/fax-machine"],
    ["Cash Drawer","https://pcbstore.com.bd/office-equipment/cash-drawer"],
    ["POS Terminal","https://pcbstore.com.bd/office-equipment/pos-terminal"],
    ["POS Software","https://pcbstore.com.bd/office-equipment/pos-softwares"],
    ["Money Counting Machine","https://pcbstore.com.bd/office-equipment/money-counting-machine"],
    ["Paper Shredder","https://pcbstore.com.bd/office-equipment/paper-shredder"],
    ["Laminating Machine","https://pcbstore.com.bd/office-equipment/laminating-machine"],
    ["Binding Machine","https://pcbstore.com.bd/office-equipment/binding-machine"],
    ["Digital Products","https://pcbstore.com.bd/office-equipment/digital-products"],
    ["Office Furniture","https://pcbstore.com.bd/office-equipment/office-furniture"],
    ["Office Supplies","https://pcbstore.com.bd/office-equipment/office-supplies"],
    ["Chair","https://pcbstore.com.bd/office-equipment/chair"],
    ["Presenter","https://pcbstore.com.bd/office-equipment/presenter"],
    // Network and Router
    ["Ethernet Router","https://pcbstore.com.bd/network-and-router/ethernet-router"],
    ["Pocket Router","https://pcbstore.com.bd/network-and-router/pocket-router"],
    ["WiFi Range Extender","https://pcbstore.com.bd/network-and-router/wifi-range-extender"],
    ["Networking Cable","https://pcbstore.com.bd/network-and-router/networking-cable"],
    ["Firewall","https://pcbstore.com.bd/network-and-router/firewall"],
    ["Network Switch","https://pcbstore.com.bd/network-and-router/network-switch"],
    ["WiFi Adapter","https://pcbstore.com.bd/network-and-router/wifi-adapter"],
    ["LAN Card","https://pcbstore.com.bd/network-and-router/lan-card"],
    ["Patch Cord","https://pcbstore.com.bd/network-and-router/patch-cord"],
    ["DAC Cable","https://pcbstore.com.bd/network-and-router/dac-cable"],
    ["Access Point","https://pcbstore.com.bd/network-and-router/access-point"],
    ["PoE Injector","https://pcbstore.com.bd/network-and-router/poe-injector"],
    ["Crimping Tool","https://pcbstore.com.bd/network-and-router/crimping-tool"],
    ["Connector","https://pcbstore.com.bd/network-and-router/connector"],
    ["Media Converter","https://pcbstore.com.bd/network-and-router/media-converter"],
    ["RJ45 Connector & Ethernet Cable","https://pcbstore.com.bd/network-and-router/rj45-connector-and-ethernet-cable"],
    ["SFP Module & Fiber","https://pcbstore.com.bd/network-and-router/sfp-module-and-fiber"],
    ["QSFP Module & Fiber","https://pcbstore.com.bd/network-and-router/qsfp-module-and-fiber"],
    ["Load Balancer","https://pcbstore.com.bd/network-and-router/load-balancer"],
    ["ONU","https://pcbstore.com.bd/network-and-router/onu"],
    ["Splicer Machine","https://pcbstore.com.bd/network-and-router/splicer-machine"],
    ["Starlink","https://pcbstore.com.bd/network-and-router/starlink"],
    ["Wireless Router","https://pcbstore.com.bd/network-and-router/wireless-router"],
    // Server and NAS
    ["PCIe LSI/ Raid Card","https://pcbstore.com.bd/server-and-nas/pcie-lsi-and-raid-card"],
    ["Server Cooler","https://pcbstore.com.bd/server-and-nas/server-cooler"],
    ["Server Casing","https://pcbstore.com.bd/server-and-nas/server-casing"],
    ["NAS/Hard Drive","https://pcbstore.com.bd/server-and-nas/nas-hard-drive"],
    ["Server Barebone","https://pcbstore.com.bd/server-and-nas/server-barebone"],
    ["NAS/ Storage Server","https://pcbstore.com.bd/server-and-nas/nas-and-storage-server"],
    ["MikroTik Server","https://pcbstore.com.bd/server-and-nas/mikrotik-server"],
    ["AMD Ryzen/ EPYC Server","https://pcbstore.com.bd/server-and-nas/amd-ryzen-and-epyc-server"],
    ["INTEL XEON Server","https://pcbstore.com.bd/server-and-nas/intel-xeon-server"],
    ["SAS Hard Disk Drive","https://pcbstore.com.bd/server-and-nas/sas-hard-disk-drive"],
    ["SAS SSD Drive","https://pcbstore.com.bd/server-and-nas/sas-ssd-drive"],
    ["ECC RAM","https://pcbstore.com.bd/server-and-nas/ecc-ram"],
    ["Server Power Supply","https://pcbstore.com.bd/server-and-nas/server-power-supply"],
    ["Server Rack","https://pcbstore.com.bd/server-and-nas/server-rack"],
    ["PDU & Cable","https://pcbstore.com.bd/server-and-nas/pdu-and-cable"],
    ["Server CPU","https://pcbstore.com.bd/server-and-nas/server-cpu"],
    // AI & Work Station HPC
    ["AMD Threadripper","https://pcbstore.com.bd/ai-and-work-station-hpc/amd-threadripper"],
    ["AMD EPYC","https://pcbstore.com.bd/ai-and-work-station-hpc/amd-epyc"],
    ["Intel Xeon","https://pcbstore.com.bd/ai-and-work-station-hpc/intel-xeon"],
    ["WorkStation Motherboard","https://pcbstore.com.bd/ai-and-work-station-hpc/workstation-motherboard"],
    ["Nvidia Quadro","https://pcbstore.com.bd/ai-and-work-station-hpc/nvidia-quadro"],
    ["Nvidia BlackWell","https://pcbstore.com.bd/ai-and-work-station-hpc/nvidia-blackwell"],
    ["Nvidia DGX","https://pcbstore.com.bd/ai-and-work-station-hpc/nvidia-dgx"],
    // Camera
    ["Digital Camera","https://pcbstore.com.bd/camera/digital-camera"],
    ["Action Camera","https://pcbstore.com.bd/camera/action-camera"],
    ["Dash Cam","https://pcbstore.com.bd/camera/dash-cam"],
    ["DSLR Camera","https://pcbstore.com.bd/camera/dslr-camera"],
    ["Handycam","https://pcbstore.com.bd/camera/handycam"],
    ["Mirrorless Camera","https://pcbstore.com.bd/camera/mirrorless-camera"],
    ["Video Camera","https://pcbstore.com.bd/camera/video-camera"],
    ["Camera Lenses","https://pcbstore.com.bd/camera/camera-lenses"],
    ["Camera Accessories","https://pcbstore.com.bd/camera/camera-accessories"],
    // Security & Surveillance
    ["CCTV Camera","https://pcbstore.com.bd/security-surveillance/cctv-camera"],
    ["PTZ Camera","https://pcbstore.com.bd/security-surveillance/ptz-camera"],
    ["XVR","https://pcbstore.com.bd/security-surveillance/xvr"],
    ["WiFi Camera","https://pcbstore.com.bd/security-surveillance/wifi-camera"],
    ["NVR","https://pcbstore.com.bd/security-surveillance/nvr"],
    ["DVR","https://pcbstore.com.bd/security-surveillance/dvr"],
    ["Door Lock","https://pcbstore.com.bd/security-surveillance/door-lock"],
    ["IP Camera","https://pcbstore.com.bd/security-surveillance/ip-camera"],
    ["Smart Door Bell","https://pcbstore.com.bd/security-surveillance/smart-door-bell"],
    ["Access Control","https://pcbstore.com.bd/security-surveillance/access-control"],
    ["Entrance Control","https://pcbstore.com.bd/security-surveillance/entrance-control"],
    ["Digital Locker","https://pcbstore.com.bd/security-surveillance/digital-locker"],
    ["Fingerprint Scanner","https://pcbstore.com.bd/security-surveillance/fingerprint-scanner"],
  ];

  const CATEGORIES = [
    ["PCB","https://pcbstore.com.bd/"],
    ["PC Builder","https://pcbstore.com.bd/pc-builder"],
    ["PCB Featured PC","https://pcbstore.com.bd/pcb-featured-pc"],
    ["PCB Mouse Pad","https://pcbstore.com.bd/accessories/mouse-pad"],
    ["Vendy","https://pcbstore.com.bd/brand/vendy"],
    ["Desktop PC","https://pcbstore.com.bd/desktop-pc"],
    ["Server and NAS","https://pcbstore.com.bd/server-and-nas"],
    ["AI & Work Station HPC","https://pcbstore.com.bd/ai-work-station-hpc"],
    ["Security & Surveillance","https://pcbstore.com.bd/security-surveillance"],
    ["Monitor","https://pcbstore.com.bd/monitor"],
    ["Laptop","https://pcbstore.com.bd/laptop"],
    ["Computer Accessories","https://pcbstore.com.bd/accessories"],
    ["Network and Router","https://pcbstore.com.bd/network-and-router"],
    ["Audio","https://pcbstore.com.bd/audio"],
    ["Camera","https://pcbstore.com.bd/camera"],
    ["Office Equipment","https://pcbstore.com.bd/office-equipment"],
    ["Smartphone and Tablet","https://pcbstore.com.bd/smartphone-and-tablet"],
    ["Decorations & Collectibles","https://pcbstore.com.bd/decorations-collectibles"],
    ["UPS IPS & Power Solutions","https://pcbstore.com.bd/ups-ips-power-solutions"],
  ];

  GM_addStyle(`
    #bali-toggle-btn {
      position:fixed; bottom:24px; right:24px; z-index:999999;
      width:80px; height:80px; border-radius:50%;
      background:transparent; border:none; color:#ff3b4d;
      cursor:pointer; padding:0;
      display:flex; align-items:center; justify-content:center;
      transition:transform 0.2s, filter 0.2s;
    }
    #bali-toggle-btn:hover { transform:scale(1.08); filter:drop-shadow(0 0 10px rgba(255,59,77,0.45)); }

    #bali-panel {
      position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) scale(0.95);
      z-index:999998;
      width:700px; height:400px;
      border:1px solid rgba(255,59,77,0.45);
      border-radius:12px; font-family:'Courier New',monospace;
      box-shadow:0 0 32px rgba(255,59,77,0.25), 0 12px 48px rgba(0,0,0,0.85);
      display:none; flex-direction:column;
      overflow:hidden;
      animation:bali-in 0.2s ease forwards;
      background-image:
        radial-gradient(circle at 18% 18%, rgba(255,59,77,0.24), transparent 50%),
        radial-gradient(circle at 84% 8%, rgba(155,20,35,0.2), transparent 46%),
        linear-gradient(145deg, #050505 0%, #0b0b0c 48%, #131315 100%);
      background-size: 100% 100%;
      background-position: center;
      background-repeat: no-repeat;
    }
    #bali-panel.bali-visible { display:flex; }
    @keyframes bali-in {
      from{opacity:0;transform:translate(-50%,-50%) scale(0.93);}
      to{opacity:1;transform:translate(-50%,-50%) scale(1);}
    }

    #bali-header {
      background:rgba(0,0,0,0.58); padding:12px 16px; flex-shrink:0;
      display:flex; align-items:center; justify-content:space-between;
      border-bottom:1px solid rgba(255,59,77,0.35);
    }
    #bali-header h2 { margin:0; font-size:12px; font-weight:700; color:#ffe9ec; letter-spacing:2px; text-transform:uppercase; text-shadow:0 0 9px rgba(255,59,77,0.5); }
    #bali-entry-count { font-size:10px; color:#ffd2d8; opacity:0.8; }

    #bali-body {
      overflow-y:auto; padding:14px 14px 0; display:flex;
      flex-direction:column; gap:11px;
      scrollbar-width:thin; scrollbar-color:rgba(255,255,255,0.5) transparent;
      background:rgba(0,0,0,0.2);
    }

    .bali-label {
      font-size:10px; letter-spacing:1.5px; text-transform:uppercase;
      color:#ffd8dd; margin-bottom:4px; display:block;
      font-weight:900; text-shadow:0 0 6px rgba(255,59,77,0.45);
    }
    .bali-input {
      width:100%; background:rgba(5,5,5,0.72); border:1px solid rgba(255,59,77,0.35);
      border-radius:6px; color:#fff2f4; font-family:'Courier New',monospace;
      font-size:12px; padding:8px 10px; box-sizing:border-box;
      transition:border-color 0.2s; outline:none;
    }
    .bali-input:focus { border-color:#ff3b4d; box-shadow:0 0 10px rgba(255,59,77,0.35); }
    .bali-input::placeholder { color:rgba(255,210,216,0.45); }
    .bali-row { display:flex; gap:8px; align-items:stretch; }
    .bali-row .bali-input { flex:1; }

    /* Brand quick-select */
    #bali-brand-section { display:flex; flex-direction:column; gap:6px; }
    #bali-brand-alpha { display:flex; flex-wrap:wrap; gap:3px; }
    #bali-brand-search {
      width:100%; box-sizing:border-box;
      background:rgba(5,5,5,0.72); border:1px solid rgba(255,59,77,0.35); border-radius:6px;
      color:#fff2f4; font-size:11px; padding:6px 10px;
      outline:none; font-family:'Courier New',monospace;
      transition:border-color 0.2s;
    }
    #bali-brand-search:focus { border-color:#ff3b4d; box-shadow:0 0 10px rgba(255,59,77,0.35); }
    #bali-brand-search::placeholder { color:rgba(255,210,216,0.45); }
    #bali-brand-buttons {
      display:flex; flex-wrap:wrap; gap:5px;
      max-height:120px; overflow-y:auto;
      scrollbar-width:thin; scrollbar-color:rgba(255,255,255,0.4) transparent;
    }
    .b-brand-btn {
      background:rgba(16,16,16,0.92); border:1px solid rgba(255,59,77,0.35); color:#ffe9ec;
      font-size:11px; padding:4px 9px; border-radius:5px; cursor:pointer;
      transition:background 0.15s, border-color 0.15s, transform 0.1s;
      white-space:nowrap; font-family:'Courier New',monospace;
      text-shadow:none;
    }
    .b-brand-btn:hover { background:rgba(255,59,77,0.18); border-color:#ff3b4d; color:#fff; transform:scale(1.03); box-shadow:0 0 8px rgba(255,59,77,0.35); }
    .b-brand-btn.selected { background:rgba(255,59,77,0.25); border-color:#ff4b5c; color:#fff; font-weight:700; box-shadow:0 0 10px rgba(255,59,77,0.45); }

    #bali-options {
      display:flex; gap:10px; flex-wrap:wrap;
      background:rgba(8,8,8,0.74); padding:6px 10px; border-radius:6px; border:1px solid rgba(255,59,77,0.22);
    }
    .bali-checkbox-label {
      display:flex; align-items:center; gap:5px;
      font-size:11px; color:#ffd9de; cursor:pointer; user-select:none;
      font-weight:700; text-shadow:none;
    }
    .bali-checkbox-label input[type=checkbox] { accent-color:#ff3b4d; }

    .bali-divider { border:none; border-top:1px solid rgba(255,59,77,0.24); margin:0; }

    #bali-entries {
      max-height:140px; overflow-y:auto;
      display:flex; flex-direction:column; gap:6px;
      scrollbar-width:thin; scrollbar-color:rgba(255,255,255,0.4) transparent;
    }
    .bali-entry {
      display:grid; grid-template-columns:1fr 1fr auto;
      gap:6px; align-items:center;
      background:rgba(8,8,8,0.78); border:1px solid rgba(255,59,77,0.24);
      border-radius:6px; padding:7px 10px;
    }
    .bali-entry-text { font-size:11px; color:#ffe9ec; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-shadow:none; }
    .bali-entry-url  { font-size:10px; color:rgba(255,202,209,0.78); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .bali-remove-btn {
      background:none; border:1px solid rgba(255,59,77,0.6); color:#ffdbe0;
      border-radius:4px; cursor:pointer; font-size:11px;
      width:22px; height:22px; display:flex; align-items:center;
      justify-content:center; flex-shrink:0; transition:background 0.15s;
    }
    .bali-remove-btn:hover { background:rgba(255,59,77,0.2); }

    .bali-btn {
      padding:8px 14px; border-radius:6px; cursor:pointer;
      font-family:'Courier New',monospace; font-size:11px;
      font-weight:700; letter-spacing:1px; text-transform:uppercase;
      border:none; transition:opacity 0.2s, transform 0.1s; white-space:nowrap;
    }
    .bali-btn:hover { opacity:0.85; }
    .bali-btn:active { transform:scale(0.97); }
    #bali-add-btn   { background:rgba(16,16,16,0.9); color:#ffe9ec; border:1px solid rgba(255,59,77,0.5); box-shadow:0 0 8px rgba(255,59,77,0.2); }
    #bali-run-btn   { background:linear-gradient(180deg, #ff3b4d 0%, #d92b3b 100%); color:#fff; flex:1; box-shadow:0 0 15px rgba(255,59,77,0.35); }
    #bali-undo-btn  { background:rgba(16,16,16,0.9); color:#ffe9ec; border:1px solid rgba(255,59,77,0.45); }
    #bali-clear-btn { background:rgba(10,10,10,0.9); color:rgba(255,210,216,0.75); border:1px solid rgba(255,59,77,0.25); }

    #bali-status {
      font-size:11px; color:#ffe9ec; min-height:16px; font-weight:700;
      text-align:center; padding:8px 14px; flex-shrink:0;
      background:rgba(0,0,0,0.55); text-shadow:none;
    }
    #bali-status.ok   { color:#afffaf; text-shadow:0 0 8px rgba(100,255,100,0.7); }
    #bali-status.err  { color:#ffaaaa; text-shadow:0 0 8px rgba(255,100,100,0.7); }
    #bali-status.warn { color:#ffe0a0; text-shadow:0 0 8px rgba(255,200,50,0.7); }
    #bali-no-entries { font-size:11px; color:rgba(255,210,216,0.78); font-weight:700; text-align:center; padding:10px 0; text-shadow:none; }
    #bali-no-brands  { font-size:11px; color:rgba(255,210,216,0.78); font-weight:700; text-align:center; padding:8px 0; width:100%; text-shadow:none; }

    /* Category quick-select */
    #bali-cat-section { display:flex; flex-direction:column; gap:6px; }
    #bali-cat-buttons { display:flex; flex-wrap:wrap; gap:5px; }
    .b-cat-btn {
      background:rgba(16,16,16,0.92); border:1px solid rgba(255,59,77,0.35); color:#ffe9ec;
      font-size:11px; padding:4px 10px; border-radius:5px; cursor:pointer;
      transition:background 0.15s, border-color 0.15s, transform 0.1s;
      white-space:nowrap; font-family:'Courier New',monospace;
      text-shadow:none;
    }
    .b-cat-btn:hover { background:rgba(255,59,77,0.18); border-color:#ff3b4d; color:#fff; transform:scale(1.03); box-shadow:0 0 8px rgba(255,59,77,0.35); }
    .b-cat-btn.selected { background:rgba(255,59,77,0.25); border-color:#ff4b5c; font-weight:700; box-shadow:0 0 10px rgba(255,59,77,0.45); }

    /* PC Builder button highlight */
    .b-cat-btn.pcbuilder {
      background:rgba(233,69,96,0.25); border-color:rgba(233,69,96,0.8); color:#fff;
      font-weight:700; text-shadow:0 0 8px rgba(233,69,96,0.9);
      box-shadow:0 0 8px rgba(233,69,96,0.4);
    }
    .b-cat-btn.pcbuilder:hover { background:rgba(233,69,96,0.45); border-color:#e94560; box-shadow:0 0 14px rgba(233,69,96,0.7); }
    .b-cat-btn.pcbuilder.selected { background:rgba(233,69,96,0.5); border-color:#e94560; box-shadow:0 0 16px rgba(233,69,96,0.8); }

    /* PCB homepage button highlight */
    .b-cat-btn.pcb-home {
      background:rgba(255,255,255,0.15); border-color:rgba(255,255,255,0.8); color:#fff;
      font-weight:700; text-shadow:0 0 8px rgba(255,255,255,0.9);
      box-shadow:0 0 8px rgba(255,255,255,0.3);
    }
    .b-cat-btn.pcb-home:hover { background:rgba(255,255,255,0.3); border-color:#fff; box-shadow:0 0 14px rgba(255,255,255,0.6); }
    .b-cat-btn.pcb-home.selected { background:rgba(255,255,255,0.35); border-color:#fff; box-shadow:0 0 16px rgba(255,255,255,0.7); }
  `);

  // ── UI ──────────────────────────────────────────────────────────────────────
  const toggle = document.createElement('button');
  toggle.id = 'bali-toggle-btn'; toggle.title = 'PCBStore Bulk Link Inserter';
  toggle.innerHTML = `
    <svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="baliIconGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#111214"/>
          <stop offset="100%" stop-color="#1c1d20"/>
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="38" fill="url(#baliIconGrad)" stroke="#ff3b4d" stroke-width="2.4"/>
      <circle cx="40" cy="40" r="31" fill="none" stroke="rgba(255,59,77,0.35)" stroke-width="1.2"/>
      <path d="M34 29h-3a8 8 0 0 0 0 16h6a2 2 0 0 0 0-4h-6a4 4 0 0 1 0-8h3a2 2 0 0 0 0-4zm12 0h3a8 8 0 0 1 0 16h-6a2 2 0 0 1 0-4h6a4 4 0 0 0 0-8h-3a2 2 0 0 1 0-4zm-10 9h8a2 2 0 0 1 0 4h-8a2 2 0 0 1 0-4z" fill="#ffeef1"/>
    </svg>`;
  document.body.appendChild(toggle);

  const panel = document.createElement('div');
  panel.id = 'bali-panel';
  panel.innerHTML = `
    <div id="bali-header">
      <h2>⚓ PCBStore Link Inserter</h2>
      <span id="bali-entry-count">0 entries</span>
    </div>

    <div id="bali-body">

      <!-- Anchor Text -->
      <div>
        <span class="bali-label">Anchor Text</span>
        <input id="bali-text-input" class="bali-input" type="text" placeholder="Text to find & link…">
      </div>

      <!-- URL + Add -->
      <div>
        <span class="bali-label">URL</span>
        <div class="bali-row">
          <input id="bali-url-input" class="bali-input" type="text" placeholder="https://pcbstore.com.bd/…">
          <button class="bali-btn" id="bali-add-btn">+ Add</button>
        </div>
      </div>

      <!-- Brand Quick-Select -->
      <div id="bali-brand-section">
        <span class="bali-label">Quick URL Select</span>
        <input id="bali-brand-search" type="text" placeholder="Search brand or category…">
        <div id="bali-brand-buttons"><div id="bali-no-brands">Type to search…</div></div>
      </div>

      <!-- Category Quick-Select -->
      <div id="bali-cat-section">
        <span class="bali-label">Quick Category Select</span>
        <div id="bali-cat-buttons"></div>
      </div>

      <!-- Options -->
      <div id="bali-options">
        <label class="bali-checkbox-label"><input type="checkbox" id="opt-case"> Case sensitive</label>
        <label class="bali-checkbox-label"><input type="checkbox" id="opt-new-tab" checked> New tab</label>
        <label class="bali-checkbox-label"><input type="checkbox" id="opt-first-only"> First only</label>
        <label class="bali-checkbox-label"><input type="checkbox" id="opt-nofollow"> nofollow</label>
      </div>

      <hr class="bali-divider">

      <!-- Queue -->
      <div>
        <span class="bali-label">Queue</span>
        <div id="bali-entries">
          <div id="bali-no-entries">No entries yet. Add anchor text + URL above.</div>
        </div>
      </div>

      <hr class="bali-divider">

      <!-- Actions -->
      <div class="bali-row" style="padding-bottom:14px">
        <button class="bali-btn" id="bali-run-btn">▶ Run All</button>
        <button class="bali-btn" id="bali-undo-btn">↩ Undo</button>
        <button class="bali-btn" id="bali-clear-btn">✕ Clear</button>
      </div>

    </div>

    <div id="bali-status"></div>
  `;
  document.body.appendChild(panel);

  const $ = id => document.getElementById(id);

  // ── Brand search ─────────────────────────────────────────────────────────────
  const ALL_URLS = [...BRANDS, ...CATEGORIES];

  function renderBrands(q='') {
    const wrap = $('bali-brand-buttons');
    wrap.innerHTML = '';
    if (!q) { wrap.innerHTML='<div id="bali-no-brands">Type to search…</div>'; return; }
    const list = ALL_URLS.filter(([n])=>n.toLowerCase().includes(q.toLowerCase()));
    if (!list.length) { wrap.innerHTML='<div id="bali-no-brands">No results found.</div>'; return; }
    list.forEach(([name, url]) => {
      const btn = document.createElement('button');
      btn.className = 'b-brand-btn';
      btn.textContent = name;
      btn.title = url;
      btn.addEventListener('click', () => {
        $('bali-url-input').value = url;
        document.querySelectorAll('.b-brand-btn').forEach(x=>x.classList.remove('selected'));
        btn.classList.add('selected');
        setStatus(`"${name}" URL loaded — add anchor text, then + Add`, 'ok');
        $('bali-text-input').focus();
      });
      wrap.appendChild(btn);
    });
  }

  $('bali-brand-search').addEventListener('input', e => renderBrands(e.target.value.trim()));

  // ── Category buttons ─────────────────────────────────────────────────────────
  const catWrap = $('bali-cat-buttons');
  CATEGORIES.forEach(([name, url]) => {
    const btn = document.createElement('button');
    btn.className = 'b-cat-btn' + (name === 'PCB' ? ' pcb-home' : name === 'PC Builder' ? ' pcbuilder' : '');
    btn.textContent = name;
    btn.title = url;
    btn.addEventListener('click', () => {
      $('bali-url-input').value = url;
      document.querySelectorAll('.b-cat-btn').forEach(x=>x.classList.remove('selected'));
      btn.classList.add('selected');
      setStatus(`"${name}" URL loaded — add anchor text, then + Add`, 'ok');
      $('bali-text-input').focus();
    });
    catWrap.appendChild(btn);
  });

  // ── State + helpers ──────────────────────────────────────────────────────────
  let entries = [], undoStack = [];

  function setStatus(msg, cls='') {
    const el=$('bali-status'); el.textContent=msg; el.className=cls;
  }
  function updateCount() {
    $('bali-entry-count').textContent=`${entries.length} entr${entries.length===1?'y':'ies'}`;
  }
  function renderEntries() {
    const c=$('bali-entries'); c.innerHTML='';
    if (!entries.length) { c.innerHTML='<div id="bali-no-entries">No entries yet. Add anchor text + URL above.</div>'; return; }
    entries.forEach((e,i)=>{
      const row=document.createElement('div'); row.className='bali-entry';
      row.innerHTML=`
        <span class="bali-entry-text" title="${e.text}">${e.text}</span>
        <span class="bali-entry-url" title="${e.url}">${e.url}</span>
        <button class="bali-remove-btn" data-i="${i}">✕</button>`;
      c.appendChild(row);
    });
    c.querySelectorAll('.bali-remove-btn').forEach(btn=>btn.addEventListener('click',()=>{
      entries.splice(+btn.dataset.i,1); renderEntries(); updateCount();
    }));
  }

  // ── Core link insert ─────────────────────────────────────────────────────────
  function linkTextInPage(text, url, opts) {
    if (!text) return 0;
    const regex = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), opts.caseSensitive?'g':'gi');
    const target = opts.newTab?'_blank':'_self';
    const rel = opts.nofollow?'nofollow noreferrer':undefined;
    let count=0;
    function walk(n) {
      if (opts.firstOnly && count>0) return;
      if (n.nodeType===Node.TEXT_NODE) {
        const val=n.nodeValue;
        if (!regex.test(val)) return;
        regex.lastIndex=0;
        const frag=document.createDocumentFragment();
        let last=0,m;
        while ((m=regex.exec(val))!==null) {
          if (opts.firstOnly && count>0) break;
          if (m.index>last) frag.appendChild(document.createTextNode(val.slice(last,m.index)));
          const a=document.createElement('a');
          a.href=url; a.textContent=m[0]; a.target=target;
          if (rel) a.rel=rel;
          a.style.cssText='color:#e94560;text-decoration:underline;';
          frag.appendChild(a); count++; last=regex.lastIndex;
          if (opts.firstOnly) break;
        }
        if (last<val.length) frag.appendChild(document.createTextNode(val.slice(last)));
        n.parentNode.replaceChild(frag,n);
      } else if (
        n.nodeType===Node.ELEMENT_NODE &&
        !['A','SCRIPT','STYLE','NOSCRIPT'].includes(n.tagName) &&
        !n.closest('#bali-panel') && !n.closest('#bali-toggle-btn')
      ) { Array.from(n.childNodes).forEach(walk); }
    }
    walk(document.body);
    return count;
  }

  // ── Events ───────────────────────────────────────────────────────────────────
  toggle.addEventListener('click', ()=>panel.classList.toggle('bali-visible'));

  document.addEventListener('keydown', e => {
    if (e.altKey && e.key === 'q') {
      e.preventDefault();
      panel.classList.toggle('bali-visible');
    }
  });

  $('bali-add-btn').addEventListener('click', ()=>{
    const text=$('bali-text-input').value.trim();
    const url=$('bali-url-input').value.trim();
    if (!text) { setStatus('Anchor text required.','err'); return; }
    if (!url||!/^https?:\/\//i.test(url)) { setStatus('Enter a valid URL.','err'); return; }
    entries.push({text,url});
    $('bali-text-input').value=''; $('bali-url-input').value='';
    document.querySelectorAll('.b-brand-btn').forEach(x=>x.classList.remove('selected'));
    renderEntries(); updateCount();
    setStatus(`Added: "${text}"`, 'ok');
  });

  [$('bali-text-input'),$('bali-url-input')].forEach(inp=>
    inp.addEventListener('keydown', e=>{ if(e.key==='Enter') $('bali-add-btn').click(); })
  );

  $('bali-run-btn').addEventListener('click', ()=>{
    if (!entries.length) { setStatus('No entries in queue.','warn'); return; }
    const opts={
      caseSensitive:$('opt-case').checked,
      newTab:$('opt-new-tab').checked,
      firstOnly:$('opt-first-only').checked,
      nofollow:$('opt-nofollow').checked,
    };
    undoStack.push(document.body.innerHTML);
    if (undoStack.length>10) undoStack.shift();
    let total=0;
    entries.forEach(e=>{ total+=linkTextInPage(e.text,e.url,opts); });
    setStatus(
      total>0 ? `✓ Inserted ${total} link(s) across ${entries.length} rule(s).` : 'No matching text found.',
      total>0?'ok':'warn'
    );
  });

  $('bali-undo-btn').addEventListener('click', ()=>{
    if (!undoStack.length) { setStatus('Nothing to undo.','warn'); return; }
    document.body.innerHTML=undoStack.pop();
    setStatus('↩ Undone.','warn');
  });

  $('bali-clear-btn').addEventListener('click', ()=>{
    entries=[]; renderEntries(); updateCount();
    setStatus('Queue cleared.','warn');
  });

})();