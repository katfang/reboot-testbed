"use client";

export default function Error({ message } : { message: string }) {
  return (
    <div className="text-red-500">
      {message}
    </div>
  );
}
