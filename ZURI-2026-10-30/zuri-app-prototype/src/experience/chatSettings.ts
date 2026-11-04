import type {LocalData} from './model';
export const chatWallpapers=['default','midnight','ocean','rose','forest','lake-photo','forest-photo','mountain-photo'] as const;
export type ChatWallpaper=typeof chatWallpapers[number];
export function setChatWallpaper(d:LocalData,id:string,wallpaper:ChatWallpaper):LocalData{if(!chatWallpapers.includes(wallpaper))throw Error('Choose a supported wallpaper.');return {...d,chatWallpapers:{...d.chatWallpapers,[id]:wallpaper}};}

export const wallpaperLabels:Record<ChatWallpaper,string>={default:'App theme',midnight:'Midnight',ocean:'Ocean',rose:'Rose',forest:'Forest','lake-photo':'Lakeside','forest-photo':'Forest light','mountain-photo':'Mountains'};
