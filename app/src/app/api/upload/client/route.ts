import { jsonError } from "@/server/response";

export async function POST() {
  return jsonError(410, {
    code: "DIRECT_UPLOAD_DISABLED",
    message: "직접 업로드는 비활성화되었습니다. 서버 업로드 경로를 사용해 주세요.",
  });
}
