import os
import glob
import re
import openpyxl
import json
from supabase import create_client, Client

SU = 'https://zmqvjtenuxlvwfopfroc.supabase.co'
SK = 'sb_publishable_ezZ7_UyticpI7aeLKY3Rew_i_FaZBDh'
supabase: Client = create_client(SU, SK)

def clean_phone(raw):
    if not raw:
        return None
    s = str(raw).strip()
    digits = re.sub(r'\D', '', s)
    if len(digits) >= 10:
        return digits[-10:]
    return None

def clean_str(val):
    if val is None:
        return ''
    s = str(val).strip()
    if s.lower() in ('none', 'null', 'nan', 'undefined'):
        return ''
    return s

def map_source(raw):
    s = clean_str(raw).lower()
    if 'insta' in s: return 'instagram'
    if 'face' in s or 'fb' in s: return 'facebook'
    if 'walk' in s: return 'walk_in'
    if any(k in s for k in ['ref', 'simrat', 'preeti', 'lakshay', 'aadya', 'friend']): return 'referral'
    if 'web' in s or 'site' in s: return 'website'
    if 'wa' in s or 'whatsapp' in s or 'sensy' in s: return 'whatsapp'
    if 'college' in s or 'school' in s or 'pu' in s: return 'college_visit'
    return 'other'

def map_status(raw):
    s = clean_str(raw).lower()
    if any(k in s for k in ['enrol', 'admit', 'paid', 'joined', 'converted']): return 'enrolled'
    if any(k in s for k in ['close', 'lost', 'not int', 'unpicked', 'reject', 'wrong']): return 'lost'
    if any(k in s for k in ['contact', 'visit', 'demo', 'intrest', 'follow', 'call', 'talk']): return 'contacted'
    return 'new'

def map_temperature(raw, tab_name=""):
    s = (clean_str(raw) + " " + tab_name).lower()
    if 'hot' in s: return 'hot'
    if 'warm' in s: return 'warm'
    if 'cold' in s: return 'cold'
    return 'warm'

async function_main():
    pass
