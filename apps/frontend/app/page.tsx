"use client";
import { useState } from "react";
import { useEffect } from "react";
import { Nav } from "../components/Nav";
import Loading from "../components/Loading";
import { AuthProvider, useAuth } from "./context/useAuth";
import { log } from "node:console";
// import { Doc } from "@repo/common/types";

type Doc = {
  id: string;
  title: string;
  owner: { name: string; email: string };
  collaborators: { name: string; email: string }[];
};

function Home() {
  const {user, refetch} = useAuth();
  const [documents, setDocuments] = useState<Doc[] | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [text, setText] = useState("Create");

  useEffect(() => {
    if(!localStorage.getItem('token')) {
      window.location.href = '/log-in';
    }

    const fetchData = async () => {
      try {
        const document = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/document/all`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
      
        if (!document.ok) {
          if(document.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/log-in';
          }
          throw new Error('Failed to fetch documents');
        }

        const documentData = await document.json();
        setDocuments(documentData);
      }
      catch (err) {
        console.log(err);
      }
    }

    fetchData();

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      console.log(target.classList.contains("modal"), isVisible);

      if (isVisible) {
        console.log(target.classList.contains("modal"));
        
        if (target.classList.contains("modal")) {
          setIsVisible(false);
        }
      }

    }

    window.addEventListener("pointerup", handleClickOutside)

    return () => window.removeEventListener("pointerup", handleClickOutside);
  }, [])

  const handelModal = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains("modal")) {
      setIsVisible(false);
    }
  }

  const handelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setText("Processing...");

    const form = e.target as HTMLFormElement;
    const title = (form.elements.namedItem("title") as HTMLInputElement).value;
    const collaborators = (form.elements.namedItem("collaborators") as HTMLInputElement).value.split(",").map(email => email.trim()).filter(email => email);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/document/create`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ title, collaborators })
      });

      const data = await res.json();

      setText("Create");

      if (res.ok) {
        alert(data.msg);
        setIsVisible(false);
        form.reset();
      } else {
        alert(data.msg || "Failed to create document");
      }
      window.location.reload();
    } catch (err) {
      console.log(err);
      alert("An error occurred while creating the document");
    }
  }

  const handelDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const target = e.target as HTMLElement;
    const i = parseInt(target.dataset.index as string);
    console.log(i, documents);
    
    if(!documents) {
      alert("No documents found");
      return;
    }
    
    if(isNaN(i) || i < 0 || i >= documents.length) {
      alert("Invalid document index");
      return;
    }

    const docId = (documents[i] as Doc)["id"];

    if(!docId) {
      alert("Document ID not found");
      return;
    }
    
    if(!confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/document/${docId}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.msg);
        window.location.reload();
      } else {
        alert(data.msg || "Failed to delete document");
      }
    } catch (err) {
      console.log(err);
      alert("An error occurred while deleting the document");
    }
  }

  if (!user) {
    return <Loading />;
  }

  console.log("User:", user);

  return (
    <>
      <Nav userName={user.name}/>
      <div className="w-full flex items-center justify-center">
        <div className="w-[90%] flex flex-wrap items-center justify-items-center m-[20px] gap-8">
            {documents && documents.map((doc: Doc, i) => {
              return (
                <div key={i} className="relative w-full sm:w-[250px] max-w-2xl p-4 border border-gray-300 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = `/document/${doc.id}`}>
                  <label htmlFor="toggle" className="absolute top-2 right-2 cursor-pointer">
                    <input type="checkbox" className="opacity-0 cursor-pointer absolute top-1 peer" name="toggle" id="toggle" onClick={e => e.stopPropagation()}/>
                    <svg className="peer-checked:bg-gray-100 rounded" xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 16 16" fill="#000000">
                      <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                    </svg>
                    <ul className="hidden absolute peer-checked:block hover:block z-10 bg-amber-50 top-[30px] right-[-0%] bg-white border border-gray-300 rounded shadow-md">
                      <li className="w-[100px] pl-[10px] pt-1 pb-1 hover:bg-gray-100" onClick={handelDelete} data-index={i}>Delete</li>
                      <li className="w-[100px] pl-[10px] pt-1 pb-1 hover:bg-gray-100">Update</li>
                    </ul>
                  </label>

                  <h2 className="text-2xl font-bold mb-2">{doc.title}</h2>
                  <p className="text-gray-600">Owner: {doc.owner.name} ({doc.owner.email})</p>
                  <p className="text-gray-600">Collaborators: {doc.collaborators.map((collab: { name: string, email: string }) => collab.name).join(", ") || "None"}</p>
                </div>
              )
            })}
        </div>
      </div>

      <div>
        <button className="fixed bottom-8 right-8 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors" onClick={() => setIsVisible(true)}>
          <svg className="" fill="white" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="20" height="20" viewBox="0 0 24 24">
<path fillRule="evenodd" d="M 11 2 L 11 11 L 2 11 L 2 13 L 11 13 L 11 22 L 13 22 L 13 13 L 22 13 L 22 11 L 13 11 L 13 2 Z"></path>
</svg>
        </button>
      </div>

      <div className="fixed w-full h-full flex items-center justify-center top-0 bg-black/40" style={isVisible ? { display: 'flex' } : { display: 'none' }} onClick={handelModal}>
        <div className="bg-white p-6 rounded-lg shadow-lg w-[350px] modal" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-xl font-bold mb-4">Create New Document</h3>
          <form
            onSubmit={handelSubmit}
          >
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1" htmlFor="title">Title</label>
              <input
                type="text"
                name="title"
                id="title"
                required
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1" htmlFor="collaborators">Collaborators (comma separated emails)</label>
              <input
                type="text"
                name="collaborators"
                id="collaborators"
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="email1@example.com, email2@example.com"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Create
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

const WrappedHome = () => (
  <AuthProvider>
    <Home />
  </AuthProvider>
);

export default WrappedHome;