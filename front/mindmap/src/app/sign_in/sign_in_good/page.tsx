import Image from "next/image";

import { CircleCheck } from 'lucide-react';

import { Button } from "@/components/ui/button"

import Link from 'next/link';

export default function Home() {
  return (
    <div className="w-full h-{100vh} bg-[#FFF6FE] ">
      <div className="px-5 pt-8 w-{100vw} h-{100vh}">
        <p className="w-auto h-auto text-3xl font-bold">로그인이 완료됐어요!</p>
        <p className="w-full h-auto mt-2 text-xs">이제 회원님의 선호 정보를 바탕으로 분석할게요</p>
      </div>
      
      <div className="w-full h-56  flex justify-center pt-16">
        <div className="rounded-full bg-[#FFE5F2] w-[35rem] h-[23rem] flex justify-center pt-16">
          <div className="rounded-full bg-[#FFEFF7] w-[15rem] h-[15rem] flex justify-center pt-12">
            <CircleCheck size={120} color="#FF70BA"/>
          </div> 
        </div>
      </div>
      <div className="w-full h-32 flex justify-center mt-[17rem]">
        <Link href="/data_in_1" className="w-[22rem] h-14">
          <Button variant="destructive" className="bg-[#FF70BA] w-[22rem] h-14 border-2 rounded-[2rem] text-white font-bold hover:bg-[#FF70BA]">
            다음으로
          </Button>
        </Link>
      </div>
    </div>
  );
}

