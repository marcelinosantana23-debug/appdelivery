import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  logo: string;
  tagline: string;
  whatsapp: string;
  pix_key: string;
  pix_key_type: string;
  delivery_fee: number;
  address: string;
  hours: string;
  primary_color: string;
  primary_dark: string;
  primary_light: string;
  accent_color: string;
  is_open: boolean;
  is_active: boolean;
  created_at: string;
}

interface TenantAdminRow {
  id: string;
  tenant_id: string;
  user_id: string;
  email: string;
  role: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Create admin client with service role key
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify the caller is authenticated and is a super admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(401, { error: "Não autenticado" });
  }

  const token = authHeader.replace("Bearer ", "");
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  userClient.auth.setSession({ access_token: token, refresh_token: "" });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return jsonResponse(401, { error: "Token inválido" });
  }

  // Check if user is super admin
  const { data: adminRecord } = await adminClient
    .from("tenant_admins")
    .select("role, tenant_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!adminRecord || adminRecord.role !== "super_admin") {
    return jsonResponse(403, { error: "Acesso negado. Apenas Super Admins." });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/functions\/v1\/[^/]+/, "");
  const method = req.method;

  try {
    // GET /tenants — list all tenants
    if (path === "/tenants" && method === "GET") {
      const { data, error } = await adminClient
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) return jsonResponse(500, { error: error.message });
      return jsonResponse(200, { tenants: data });
    }

    // POST /tenants — create a new tenant + store admin account
    if (path === "/tenants" && method === "POST") {
      const body = await req.json();
      const { name, adminEmail, adminPassword } = body;

      if (!name || !adminEmail || !adminPassword) {
        return jsonResponse(400, { error: "Nome, e-mail e senha são obrigatórios" });
      }
      if (adminPassword.length < 6) {
        return jsonResponse(400, { error: "A senha deve ter pelo menos 6 caracteres" });
      }

      // Generate slug
      const { data: slugData } = await adminClient.rpc("generate_slug", { p_name: name });
      const slug = slugData as string;

      // Create the auth user for the store admin
      const { data: newUserData, error: createUserErr } = await adminClient.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
      });

      if (createUserErr) {
        return jsonResponse(400, { error: `Erro ao criar usuário: ${createUserErr.message}` });
      }

      // Insert the tenant
      const { data: tenant, error: tenantErr } = await adminClient
        .from("tenants")
        .insert({
          name,
          slug,
          logo: "🍔",
          tagline: "Peça já!",
          whatsapp: "5500000000000",
          pix_key: "",
          pix_key_type: "email",
          delivery_fee: 6.0,
          address: "",
          hours: "18:00 - 23:30",
          primary_color: "#E63946",
          primary_dark: "#C1121F",
          primary_light: "#F77F00",
          accent_color: "#FCBF49",
          is_open: true,
          is_active: true,
        })
        .select()
        .single();

      if (tenantErr) {
        // Clean up the created user
        await adminClient.auth.admin.deleteUser(newUserData.user.id);
        return jsonResponse(500, { error: tenantErr.message });
      }

      // Link the user to the tenant as a store_admin
      const { error: linkErr } = await adminClient.from("tenant_admins").insert({
        tenant_id: tenant.id,
        user_id: newUserData.user.id,
        email: adminEmail,
        role: "store_admin",
      });

      if (linkErr) {
        await adminClient.auth.admin.deleteUser(newUserData.user.id);
        await adminClient.from("tenants").delete().eq("id", tenant.id);
        return jsonResponse(500, { error: linkErr.message });
      }

      // Seed default categories
      const defaultCategories = [
        { name: "Lanches", icon: "🍔", sort_order: 0 },
        { name: "Combos", icon: "🍟", sort_order: 1 },
        { name: "Porções", icon: "🍗", sort_order: 2 },
        { name: "Bebidas", icon: "🥤", sort_order: 3 },
        { name: "Sobremesas", icon: "🍰", sort_order: 4 },
      ];

      const categoriesToInsert = defaultCategories.map((c) => ({
        tenant_id: tenant.id,
        ...c,
      }));

      await adminClient.from("categories").insert(categoriesToInsert);

      return jsonResponse(201, { tenant, adminEmail });
    }

    // PUT /tenants/:id/toggle — activate/deactivate tenant
    const toggleMatch = path.match(/^\/tenants\/([^/]+)\/toggle$/);
    if (toggleMatch && method === "PUT") {
      const tenantId = toggleMatch[1];
      const body = await req.json();
      const { isActive } = body;

      const { data, error } = await adminClient
        .from("tenants")
        .update({ is_active: isActive })
        .eq("id", tenantId)
        .select()
        .single();

      if (error) return jsonResponse(500, { error: error.message });
      return jsonResponse(200, { tenant: data });
    }

    // POST /super-admin/setup — create super admin account (one-time setup)
    if (path === "/super-admin/setup" && method === "POST") {
      const body = await req.json();
      const { email, password } = body;

      if (!email || !password) {
        return jsonResponse(400, { error: "E-mail e senha são obrigatórios" });
      }

      // Check if a super admin already exists
      const { data: existing } = await adminClient
        .from("tenant_admins")
        .select("id")
        .eq("role", "super_admin")
        .maybeSingle();

      if (existing) {
        return jsonResponse(400, { error: "Já existe um Super Admin cadastrado" });
      }

      // Create the super admin auth user
      const { data: newUserData, error: createUserErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createUserErr) {
        return jsonResponse(400, { error: createUserErr.message });
      }

      // Insert as super_admin (no tenant_id)
      const { error: linkErr } = await adminClient.from("tenant_admins").insert({
        tenant_id: null,
        user_id: newUserData.user.id,
        email,
        role: "super_admin",
      });

      if (linkErr) {
        await adminClient.auth.admin.deleteUser(newUserData.user.id);
        return jsonResponse(500, { error: linkErr.message });
      }

      return jsonResponse(201, { email });
    }

    return jsonResponse(404, { error: "Rota não encontrada" });
  } catch (err) {
    return jsonResponse(500, { error: (err as Error).message });
  }
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
