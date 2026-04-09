import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const reserveSchema = z
  .object({
    name: z.string().trim().min(1, "請填寫會議名稱"),
    unit: z.string().trim().min(1, "請填寫主辦單位"),
    date: z.string().min(1, "請選擇會議日期"),
    start: z
      .string()
      .min(1, "請選擇開始時間")
      .regex(timeRegex, "開始時間格式錯誤"),
    end: z
      .string()
      .min(1, "請選擇結束時間")
      .regex(timeRegex, "結束時間格式錯誤"),
    people: z.string().trim().min(1, "請填寫參加人員"),
    place: z.string().min(1, "請選擇會議室"),
    file: z.any().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.start && data.end && data.start >= data.end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end"],
        message: "結束時間必須晚於開始時間",
      });
    }

    if (data.start && data.start < "08:00") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["start"],
        message: "開始時間不能早於 08:00",
      });
    }

    if (data.end && data.end > "18:00") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end"],
        message: "結束時間不能晚於 18:00",
      });
    }
  });
