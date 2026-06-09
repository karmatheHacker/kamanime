import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getAnilistProfile } from "../utils/auth";

export default function useGetAnilistProfile(token) {
  const upsertUser = useMutation(api.users.upsert);

  const { isLoading, data, error, status } = useQuery({
    queryKey: ["cur_profile"],
    queryFn: () => {
      if (token) return getAnilistProfile(token);
      return null;
    },
    staleTime: 1000 * 60 * 20, // 20 mins
  });

  useEffect(() => {
    if (data?.id && data?.name) {
      upsertUser({
        anilistId: data.id,
        name: data.name,
        avatar: data.avatar?.large ?? undefined,
      }).catch(() => {});
      if (data?.avatar?.large) {
        localStorage.setItem('anilist_avatar', data.avatar.large)
      }
    }
  }, [data?.id]);

  return { isLoading, data, error, status };
}
