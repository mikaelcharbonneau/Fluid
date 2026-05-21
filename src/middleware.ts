import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/signin",
  },
});

export const config = {
  matcher: ["/", "/brands/:path*", "/api/brand-strategy", "/api/brands/:path*"],
};
