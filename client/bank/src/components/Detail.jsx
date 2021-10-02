import React, {useEffect,useState} from 'react'
import { url } from '../util/data';
import { useParams } from 'react-router-dom';

export default function Detail() {
    
    const [email, setemail] = useState("");
    const [approve, setapprove] = useState(false);
    const [data, setdata] = useState({aadhar:"jedncjinedjc",pan:"ceoimciencur"});
    let {userid} = useParams();

    useEffect(() => {
        fetch(`${url}/util/getuserdetails`,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            id: userid,
          })
      }).then(response => response.json())
      .then(res => {
          if(res.success) {
            setemail(res.message)
          }
      })
      }, [userid])

    useEffect(() => {
        if(!email) return;
        fetch(`${url}/kyc/getdetails`,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            email: email,
          })
      }).then(response => response.json())
      .then(res => {
          if(res.success) {
            setdata(res.message)
          }
      })
      }, [email])

    useEffect(() => {
        if (!approve) return;
        fetch(`${url}/kyc/approve`,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            bank:"A",
            email:email
          })
      }).then(response => response.json())
      .then(res => {
          if(res.success) {
            
          }
      })
      }, [email,approve])

    return (
        <>
            <div className="flex mt-4 justify-center items-center">
                <div className="bg-white rounded-md p-5 m-4 mb-8 text-center w-2/3">
                    <h1 className="text-gray-800 text-center p-4">{'User KYC Details'}</h1> 
                    <img className="rounded-full mx-auto" src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ1F7sotb1p-9YuR_1IFYP_nAizS5RpQoiE2g&usqp=CAU" alt="img" />
                    <p className="text-md font-semibold text-center pt-2 text-gray-800">Name</p>
                    <h2>Aadhar Details</h2>
                    <img className="mx-auto" src="data:image/jpeg;base64,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" alt="img" />
                    <p className="text-md bg-blue-100 mx-auto p-2 w-2/6 mt-4 font-bold text-center pt-2 text-gray-600">Aadhar Number: {data.aadhar}</p>
                    <h2>Pan Details</h2>
                    <img className="mx-auto" src="data:image/jpeg;base64,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" alt="img" />
                    <p className="text-md bg-blue-100 mx-auto p-2 w-2/6 mt-4 font-bold text-center pt-2 text-gray-600">Pan Number: {data.pan}</p>
                    <div className="mt-6">
                        <button onClick = {()=> setapprove(true)} className="ui primary button">
                            Approve
                        </button>
                        <button className="ui button">
                            Reject
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
