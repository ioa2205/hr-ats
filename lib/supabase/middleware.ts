import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const hrPrefix = "/hr";
const operatorPrefix = "/operator";
const onboardingPath = "/onboarding";
const authPrefix = "/auth";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isHr = pathname.startsWith(hrPrefix);
  const isOperator = pathname.startsWith(operatorPrefix);
  const isOnboarding = pathname.startsWith(onboardingPath);
  const isAuth = pathname.startsWith(authPrefix);
  const needsAuth = isHr || isOperator || isOnboarding;

  // Unauthenticated users cannot access protected routes
  if (needsAuth && !user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // For authenticated users on routes that need company check, fetch profile once
  const needsCompanyCheck = isHr || isOperator;
  const allowAuthWhenSignedIn =
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/auth/reset") ||
    pathname.startsWith("/auth/accept-invite") ||
    pathname.startsWith("/auth/login") ||
    pathname.startsWith("/auth/logout");
  const needsAuthRedirect = isAuth && !allowAuthWhenSignedIn;

  if (user && (needsCompanyCheck || needsAuthRedirect)) {
    // Operator routes require the is_operator JWT claim
    if (isOperator) {
      const isOp = user.app_metadata?.is_operator === true;
      if (!isOp) {
        return NextResponse.redirect(new URL("/hr/dashboard", request.url));
      }
      // Operators don't need a company context for the operator panel
      return supabaseResponse;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("current_company_id")
      .eq("id", user.id)
      .single();

    const hasCompany = Boolean(profile?.current_company_id);

    // HR routes require a company
    if (needsCompanyCheck && !hasCompany) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    // If the user's current company has been suspended or deleted, park them
    // on the friendly /suspended page. Operators are already returned above
    // so they are never redirected here.
    if (hasCompany && isHr) {
      const { data: company } = await supabase
        .from("companies")
        .select("status")
        .eq("id", profile!.current_company_id)
        .maybeSingle();

      if (company?.status === "suspended" || company?.status === "deleted") {
        return NextResponse.redirect(new URL("/suspended", request.url));
      }
    }

    // Auth pages: redirect signed-in users appropriately
    if (needsAuthRedirect) {
      const isOp = user.app_metadata?.is_operator === true;
      const target = isOp ? "/operator" : hasCompany ? "/hr/dashboard" : "/onboarding";
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  return supabaseResponse;
}
