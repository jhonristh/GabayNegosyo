"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGuard from "../../components/AuthGuard";
import { useAuth } from "../../lib/auth";
import { hasPremiumAccess, planLabel } from "../../lib/entitlements";
import { db } from "../../lib/db";
import { localityLabel } from "../../lib/ncr";
import { ThemePicker } from "../../components/ThemeControls";
import { siteConfig } from "../../lib/siteConfig";
import DeleteAccountSection from "../../components/DeleteAccountSection";
import DeactivateAccountSection from "../../components/DeactivateAccountSection";

function AccountInner() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => { if (user) setAvatar(localStorage.getItem(`gn-avatar-${user.id}`)); }, [user]);
  if (!user) return null;
  const profile = db.getBusinessProfile(user.id);
  const premium = hasPremiumAccess(user);

  function changeAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file=e.target.files?.[0]; if(!file) return;
    if(!["image/png","image/jpeg","image/webp"].includes(file.type) || file.size>500_000){setNotice("Choose a PNG, JPEG, or WebP image under 500 KB.");return;}
    const reader=new FileReader(); reader.onload=()=>{if(typeof reader.result!=="string")return;try{localStorage.setItem(`gn-avatar-${user!.id}`,reader.result);setAvatar(reader.result);setNotice("Picture saved on this browser only.");}catch{setNotice("This browser could not save the picture. Try a smaller image.");}};reader.readAsDataURL(file);
  }
  return <main className="screen v07-account kit-pocket"><header className="intro"><p className="v05-kicker">YOUR SPACE</p><h1>Account &amp; settings</h1><p>Manage your local picture, review your plan, and revisit your business profile.</p></header>
    <section className="v07-account-hero"><div className="v07-avatar">{avatar?<img src={avatar} alt="Your profile picture" />:<span aria-hidden="true">{user.name.trim().charAt(0).toUpperCase()}</span>}</div><div><h2>{user.name}</h2><p>{user.email}</p><span className="v07-plan-tag">{planLabel(user).toUpperCase()} PLAN</span></div></section>
    <div className="v07-account-grid"><section className="checklist-card"><h2>Profile picture</h2><p>Your picture is saved in this browser only. It will not sync across devices or appear to other users.</p><label className="secondary-btn v07-upload">Choose a picture<input type="file" accept="image/png,image/jpeg,image/webp" onChange={changeAvatar} className="visually-hidden" /></label>{avatar&&<button type="button" className="text-btn" onClick={()=>{localStorage.removeItem(`gn-avatar-${user!.id}`);setAvatar(null);setNotice("Picture removed.");}}>Remove picture</button>}{notice&&<p role="status" className="hint">{notice}</p>}</section>
    <section className="checklist-card"><h2>Business profile</h2>{profile?<><p><strong>{profile.businessName}</strong></p><p>{profile.taxpayerType.replace(/_/g," ")} · {profile.barangay}{localityLabel(profile)?`, ${localityLabel(profile)}`:""}{profile.rdoCode?` · ${profile.rdoCode}`:""}</p><Link href="/wizard" className="tutorial-link">Review or update answers ↗</Link></>:<><p>Finish your registration questions to generate a checklist.</p><Link href="/wizard" className="tutorial-link">Start wizard ↗</Link></>}</section>
    <section className="checklist-card"><h2>Plan &amp; access</h2><p><strong>{premium?"Premium guidance enabled":"Free checklist enabled"}</strong></p><p className="gn-plan-price">{siteConfig.premiumPriceLabel}</p><p>Monthly Premium subscription. Free includes the wizard, basic checklist and YouTube tutorials. Premium adds documents, detailed guidance, progress tracking, deadline status, resources, the penalty simulator and manual reminders.</p>{!premium&&<a className="primary-btn" href="/premium/checkout" target="_blank" rel="noopener noreferrer">About Premium (opens in a new tab) ↗</a>}<p className="hint">{premium?(user.entitlement?.expiresAt?`Premium is active until ${new Date(user.entitlement.expiresAt).toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"})}.`:"Premium is active on this account."):"Opens in a new tab. Payments are not connected yet, so Premium is turned on by an administrator and nothing is charged."}</p></section>
    <section className="checklist-card kit-appearance"><h2>Appearance</h2><p>Choose the standard look or the high-contrast Night Shift workspace. This is saved in this browser only.</p><ThemePicker /></section>
    <section className="checklist-card"><h2>Preferences &amp; security</h2><p>Premium reminder preferences can be configured per requirement in Deadlines. Your sign-in is managed through the connected authentication service.</p><Link href="/deadlines" className="tutorial-link">Open deadline settings ↗</Link><br/><button type="button" className="secondary-btn" onClick={async()=>{await logout();router.push("/");}}>Log out</button></section><DeactivateAccountSection /><DeleteAccountSection /></div>
    <section className="v07-account-credits"><h2>About GabayNegosyo</h2><p>An independent feasibility study prototype for Philippine micro-entrepreneurs. Project credits are listed on the <Link href="/#credits">home page</Link>. Review the <Link href="/privacy">privacy notice</Link>, <Link href="/terms">terms</Link>, and <Link href="/disclaimer">disclaimer</Link>.</p></section>
  </main>;
}
export default function AccountPage(){return <AuthGuard><AccountInner/></AuthGuard>}
