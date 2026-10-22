import { apiSuccess } from "@/lib/api-response";

export async function GET() {
  return apiSuccess({
    service: "HTN Legacy API",
    status: "ok",
  });
}
