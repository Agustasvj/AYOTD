import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
export async function GET(){
 const db=getSupabaseAdmin();
 if(!db)return NextResponse.json({status:"setup_required",database:"not_configured",app:"online"});
 const {error}=await db.from("categories").select("id").limit(1);
 return NextResponse.json({status:error?"database_error":"ok",database:error?"error":"connected",app:"online"},{status:error?503:200});
}
