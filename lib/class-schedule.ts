import { availableSeats } from "./stock";
import { gregorianToJalali, jalaliToGregorian } from "./jalali-date";
import type { InPersonClass } from "./types";

export type ClassScheduleStatus="open"|"limited"|"full"|"started"|"completed"|"cancelled";
export const classScheduleStatusLabels:Record<ClassScheduleStatus,string>={open:"ثبت‌نام باز",limited:"ظرفیت محدود",full:"تکمیل ظرفیت",started:"شروع شده",completed:"پایان یافته",cancelled:"لغو شده"};
export function deriveClassScheduleStatus(item:InPersonClass,now=new Date()):ClassScheduleStatus{
 const sessions=item.sessionSchedule??[];if(sessions.length&&sessions.every(x=>x.status==="cancelled"))return"cancelled";
 const today=now.toISOString().slice(0,10);const live=sessions.filter(x=>x.status!=="cancelled");const last=live.at(-1)?.date;
 if(live.length&&live.every(x=>x.status==="completed")||last&&last<today)return"completed";
 if(item.startDate&&item.startDate<=today)return"started";
 const remaining=availableSeats(item);if(remaining<=0)return"full";if(remaining<=Math.max(2,Math.ceil(item.capacity*.2)))return"limited";return"open";
}
export function classCategory(item:InPersonClass):string{return item.category?.trim()||item.title.split(/[؛(]/)[0].trim()||"کلاس حضوری";}
export function jalaliMonthGrid(year:number,month:number){const first=jalaliToGregorian(`${year}/${String(month).padStart(2,"0")}/01`);if(!first)return[];const nextMonth=month===12?jalaliToGregorian(`${year+1}/01/01`):jalaliToGregorian(`${year}/${String(month+1).padStart(2,"0")}/01`);if(!nextMonth)return[];const days=Math.round((Date.parse(nextMonth+"T00:00:00Z")-Date.parse(first+"T00:00:00Z"))/86400000);const start=(new Date(first+"T00:00:00Z").getUTCDay()+1)%7;return [...Array(start).fill(null),...Array.from({length:days},(_,i)=>({day:i+1,date:jalaliToGregorian(`${year}/${String(month).padStart(2,"0")}/${String(i+1).padStart(2,"0")}`)!}))];}
export function currentJalaliMonth(now=new Date()){const value=gregorianToJalali(now.toISOString().slice(0,10))??"1405/01/01";const[y,m]=value.split("/").map(Number);return{year:y,month:m};}
