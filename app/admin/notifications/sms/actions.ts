"use server";
import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { can, getSessionUser, isSuperAdmin } from "@/lib/auth";
import { isNotificationEventId } from "@/lib/notification-events";
import { deleteSmsRule, deleteSmsTemplate, emitNotificationEvent, saveSmsRule, saveSmsTemplate } from "@/lib/sms-automation";
import { normalizeIranianMobile } from "@/lib/admin-student-accounts";
import { rateLimit } from "@/lib/rate-limit";
import { getSettings, writeDbAsync } from "@/lib/store";
import { encryptSecret } from "@/lib/secret-crypto";

async function authorized(sensitive = false) {
  const user = await getSessionUser();
  if (!user) redirect("/admin");
  if (!can(user, sensitive ? "settings" : "notify") || (sensitive && !isSuperAdmin(user))) redirect("/admin");
  return user;
}
const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const who = (user: Awaited<ReturnType<typeof authorized>>) => { const { id, name, role } = user; return { id, name, role }; };
export async function saveSmsConnectionAction(fd:FormData){const me=await authorized(true);const current=getSettings();const apiKey=s(fd,"apiKey");const secret=s(fd,"secret");await writeDbAsync({settings:{...current,sms:{...current.sms,provider:fd.get("enabled")==="on"?"melipayamak":"demo",apiKey:apiKey?encryptSecret(apiKey):current.sms.apiKey,secret:secret?encryptSecret(secret):current.sms.secret,sender:s(fd,"sender")}}});await audit({action:"sms.config.updated",level:"security",actor:who(me),detail:{provider:"melipayamak",enabled:fd.get("enabled")==="on",credentialUpdated:Boolean(apiKey||secret)}});revalidatePath("/admin/notifications/sms");redirect("/admin/notifications/sms?saved=config");}
export async function upsertSmsTemplateAction(fd: FormData) { const me = await authorized(true); const vars = s(fd,"variableOrder").split(",").map((v)=>v.trim()).filter(Boolean); await saveSmsTemplate({ id:s(fd,"id") || `tpl-${crypto.randomBytes(8).toString("hex")}`, name:s(fd,"name"), provider:"melipayamak", providerTemplateId:Number(s(fd,"bodyId")), description:s(fd,"description"), enabled:fd.get("enabled")==="on", variableOrder:vars }); await audit({action:s(fd,"id")?"sms.template.updated":"sms.template.created",actor:who(me),detail:{name:s(fd,"name")}}); revalidatePath("/admin/notifications/sms"); redirect("/admin/notifications/sms?saved=template"); }
export async function removeSmsTemplateAction(fd: FormData) { const me=await authorized(true); try { await deleteSmsTemplate(s(fd,"id")); } catch { redirect("/admin/notifications/sms?error=template-in-use"); } await audit({action:"sms.template.deleted",level:"warn",actor:who(me),detail:{templateId:s(fd,"id")}}); revalidatePath("/admin/notifications/sms"); redirect("/admin/notifications/sms?saved=template"); }
export async function upsertSmsRuleAction(fd: FormData) { const me=await authorized(true); const eventId=s(fd,"eventId"); if(!isNotificationEventId(eventId)) redirect("/admin/notifications/sms?error=unknown-event"); await saveSmsRule({id:s(fd,"id")||`rule-${crypto.randomBytes(8).toString("hex")}`,eventId,templateId:s(fd,"templateId"),enabled:fd.get("enabled")==="on",priority:Number(s(fd,"priority")||100),conditions:[],recipientStrategy:"event_recipient"}); await audit({action:s(fd,"id")?"sms.rule.updated":"sms.rule.created",actor:who(me),detail:{eventId,templateId:s(fd,"templateId")}}); revalidatePath("/admin/notifications/sms"); redirect("/admin/notifications/sms?saved=rule"); }
export async function removeSmsRuleAction(fd:FormData){const me=await authorized(true);await deleteSmsRule(s(fd,"id"));await audit({action:"sms.rule.deleted",level:"warn",actor:who(me),detail:{ruleId:s(fd,"id")}});revalidatePath("/admin/notifications/sms");redirect("/admin/notifications/sms?saved=rule");}
export async function testSmsTemplateAction(fd:FormData){const me=await authorized();const phone=normalizeIranianMobile(s(fd,"phone"));const eventId=s(fd,"eventId");if(!phone||!isNotificationEventId(eventId))redirect("/admin/notifications/sms?error=invalid-test");const limited=rateLimit(`sms-test:${me.id}`,3,15*60_000);if(!limited.ok)redirect("/admin/notifications/sms?error=rate-limit");const payload=Object.fromEntries(s(fd,"variables").split(";").map((part)=>{const i=part.indexOf("=");return i>0?[part.slice(0,i).trim(),part.slice(i+1).trim()]:["",""]}).filter(([k])=>k));const result=await emitNotificationEvent({eventId,eventKey:`sms.test:${me.id}:${Date.now()}`,recipient:phone,payload});await audit({action:"sms.test.sent",actor:who(me),detail:{eventId,ok:result.ok,sent:result.sent}});revalidatePath("/admin/notifications/sms");redirect(`/admin/notifications/sms?saved=${result.ok?"test":"test-failed"}`);}
