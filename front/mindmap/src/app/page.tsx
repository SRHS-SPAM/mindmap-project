import { Button } from "@/components/ui/button"

import Link from 'next/link';


export default function Home() {
  return (
    <div className="w-full h-[100vh] bg-[#CCD4EE] justify-center flex-col">

      <div className="justify-items-center pt-52">
        <img src="/logo.png" alt="로고" />
      </div>
      
      <div className="w-full h-32 flex justify-center gap-3 mt-20">
        <Link href="/sign_up" className="w-56 h-12">
          <Button variant="outline" className="bg-[#CCD8FF] border-none shadow-2xl w-56 h-12 border-2 rounded-3xl text-black font-bold hover:bg-[#b0bff0]">
            회원가입
          </Button>
        </Link>
        <Link href="/sign_in" className="w-56 h-12">
          <Button variant="outline" className="bg-[#CCD8FF] border-none shadow-2xl w-56 h-12 border-2 rounded-3xl text-black font-bold hover:bg-[#b0bff0]">
            로그인
          </Button>
        </Link>
      </div>
    </div>
  );
}

