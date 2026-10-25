import { save, clear } from '../public/js/save.js';

clear();
save('pixel-village:dungeons', JSON.stringify(['crypte','galerie','antre']));
save('pixel-village:loot', JSON.stringify({coins:0,items:{},equipped:{arme:null,armure:null,talisman:null}}));
save('pixel-village:rewards', JSON.stringify([]));
save('pixel-village:skills', JSON.stringify({level:1,xp:0,points:1,unlocked:[]}));
save('pixel-village:name', 'Aventurière');
save('pixel-village:color', '#3b8fd6');
console.log('OK');
