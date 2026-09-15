Imports System.Data.SqlClient

Module Utilities

    Public Function GetMoveNo1() As Integer
        Try
            Dim MoveNo As Integer

            cnn1.Open()
            Dim cmdMoveNo As New SqlCommand("Select Max(TransNO) From RequestBill", cnn1)
            MoveNo = CInt(cmdMoveNo.ExecuteScalar.ToString) + 1
            cnn1.Close()

            Return MoveNo
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            Return 1
        End Try
    End Function

    Public Function GetMoveNo() As Integer
        Try
            Dim MoveNo As Integer

            cnn1.Open()
            Dim cmdMoveNo As New SqlCommand("Select Max(MoveNo) From Transactions", cnn1)
            MoveNo = CInt(cmdMoveNo.ExecuteScalar.ToString) + 1
            cnn1.Close()

            Return MoveNo
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            Return 1
        End Try
    End Function

    Public Function GetPaySNo() As Integer
        Try
            Dim MoveNo As Integer
            Dim cmdMoveNo As New SqlCommand("Select Max(SNo) From Transactions Where Transtype=N'سند دفع'", cnn1)

            cnn1.Open()
            MoveNo = CInt(cmdMoveNo.ExecuteScalar.ToString) + 1
            cnn1.Close()

            Return MoveNo
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            Return 1
        End Try
    End Function

    Public Function GetDocSNo(ByVal UserName As String) As Integer
        Try
            Dim X As Integer = 0
            Dim cmd As New SqlCommand("Select * From BillSNo Where UserName=N'" & UserName & "'", cnn)
            Dim Reader As SqlDataReader

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Dim SNo As Integer = CInt(Reader.Item(0))
                Dim Letter As String = CStr(Reader.Item(1))
                Dim Min As Integer = CInt(Reader.Item(2))
                Dim Max As Integer = CInt(Reader.Item(3))
                Dim Amount As Integer = CInt(Reader.Item(4))
                Dim Curr As Integer = CInt(Reader.Item(5))

                If Curr = 0 Then
                    X = Min
                    SNLetter = Letter
                    Dim cmd1 As New SqlCommand("Update BillSNo Set CurrentSNo=SFrom Where SNo=" & SNo, cnn1)
                    cnn1.Open()
                    cmd1.ExecuteNonQuery()
                    cnn1.Close()
                ElseIf Curr = Max Then
                    Continue While
                Else
                    X = CStr(CInt(Curr + 1))
                    SNLetter = Letter
                    Dim cmd1 As New SqlCommand("Update BillSNo Set CurrentSNo=CurrentSNo+1 Where SNo=" & SNo, cnn1)
                    cnn1.Open()
                    cmd1.ExecuteNonQuery()
                    cnn1.Close()
                End If
                Exit While
            End While
            cnn.Close()

            Return X
        Catch ex As Exception
            MsgBox(ex.ToString)
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
        End Try
    End Function

    Public Sub PrintReqBill(ByVal SNo As Integer)
        Try
            Dim dap As New SqlDataAdapter("Select * From RequestBill Where TransNO=" & SNo, cnn1)
            Dim das As New DataSet

            cnn1.Open()
            dap.Fill(das, "RequestBill")
            cnn1.Close()
            Dim rpt As New RequestBill
            rpt.SetDataSource(das)
            RptViewer.CrystalReportViewer1.ReportSource = rpt
            RptViewer.CrystalReportViewer1.RefreshReport()
            RptViewer.CrystalReportViewer1.Zoom(60)
            RptViewer.ShowDialog()
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Public Sub PrintBill(ByVal TransType As String, ByVal Letter As String, ByVal SNo As Integer)
        Try
            Dim dap As New SqlDataAdapter("Select * From Transactions Where Transtype = N'" & TransType & _
                                          "' and SNo=" & SNo & " and Letter=N'" & Letter & "'", cnn1)
            Dim das As New DataSet

            cnn1.Open()
            dap.Fill(das, "Transactions")
            cnn1.Close()

            If TransType = "سند قبض" Then
                Dim rpt As New GetBill
                rpt.SetDataSource(das)
                RptViewer.CrystalReportViewer1.ReportSource = rpt
                RptViewer.CrystalReportViewer1.RefreshReport()
                RptViewer.CrystalReportViewer1.Zoom(60)
                RptViewer.ShowDialog()
            ElseIf TransType = "سند دفع" Then
                Dim rpt As New PayBill
                rpt.SetDataSource(das)
                RptViewer.CrystalReportViewer1.ReportSource = rpt
                RptViewer.CrystalReportViewer1.RefreshReport()
                RptViewer.CrystalReportViewer1.Zoom(60)
                RptViewer.ShowDialog()
            End If
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Public Sub PrintBill2(ByVal SNo As Integer)
        Try
            Dim dap As New SqlDataAdapter("Select * From Transactions Where Transtype = N'سند قبض' and SNo=" & SNo, cnn1)
            Dim das As New DataSet

            cnn1.Open()
            dap.Fill(das, "Transactions")
            cnn1.Close()


            Dim rpt As New GetBill2
            rpt.SetDataSource(das)
            RptViewer.CrystalReportViewer1.ReportSource = rpt
            RptViewer.CrystalReportViewer1.RefreshReport()
            RptViewer.CrystalReportViewer1.Zoom(60)
            RptViewer.ShowDialog()
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Public Sub PrintStudentStatement(ByVal StudID As Integer)
        Try
            Dim dap As New SqlDataAdapter("Select StudID,StudName,dbo.GetStdCollege(StudID) AS College" & _
                                          ",dbo.GetStdBatch(StudID) AS Acc1,Descr,Acc2" & _
                                          ",AcdYear,BillSNo,DiscPerc,TotalValueIn,TotalValueOut,TransDate " & _
                                          "From Transactions Where StudID=" & StudID & " and (Acc2<>N'رسوم الدمغة' or  Acc2 is Null)", cnn)
            Dim das As New DataSet

            cnn.Open()
            dap.Fill(das, "Transactions")
            cnn.Close()

            Dim rpt As New StudentAccStatement

            rpt.SetDataSource(das)
            RptViewer.CrystalReportViewer1.ReportSource = rpt
            RptViewer.CrystalReportViewer1.RefreshReport()
            RptViewer.CrystalReportViewer1.Zoom(100)
            RptViewer.ShowDialog()
        Catch ex As Exception
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Public Function GetCollegesList() As ArrayList
        Try
            Dim cmd As New SqlCommand("Select Distinct College From Colleges", cnn1)
            Dim Reader As SqlDataReader
            Dim CollegeList As New ArrayList

            cnn1.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                CollegeList.Add(Reader.Item(0))
            End While
            cnn1.Close()

            Return CollegeList
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
        End Try
    End Function

    Public Function GetCollectorsList() As ArrayList
        Try
            Dim cmd As New SqlCommand("Select Distinct Collector From Collectors", cnn1)
            Dim Reader As SqlDataReader
            Dim CollectorsList As New ArrayList

            cnn1.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                CollectorsList.Add(Reader.Item(0))
            End While
            cnn1.Close()

            Return CollectorsList
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
        End Try
    End Function

    Public Function GetCustodyAccBalance(ByVal Acc As String) As Double
        Try
            Dim cmd As New SqlCommand("Select Case When Sum(TotalValueOut)-Sum(TotalValueIn) Is Null Then 0 Else " & _
                                      "                 Sum(TotalValueOut)-Sum(TotalValueIn) End From Transactions " & _
                                      "Where Acc1=N'العهد' and Acc2=N'" & Acc & "'", cnn1)
            Dim Balance As Double

            cnn1.Open()
            Balance = CDbl(cmd.ExecuteScalar.ToString)
            cnn1.Close()

            Return Balance
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
        End Try
    End Function

    Public Function GetCustodyList() As ArrayList
        Try
            Dim cmd As New SqlCommand("select Distinct Acc2 From Accounts Where Acc1=N'العهد'", cnn1)
            Dim Reader As SqlDataReader
            Dim CustodyList As New ArrayList

            cnn1.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                CustodyList.Add(Reader.Item(0))
            End While
            cnn1.Close()

            Return CustodyList
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
        End Try
    End Function


    Public Function GetBatchesList() As ArrayList
        Try
            Dim cmd As New SqlCommand("Select Distinct BatchName From Batches", cnn1)
            Dim Reader As SqlDataReader
            Dim BatchList As New ArrayList

            cnn1.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                BatchList.Add(Reader.Item(0))
            End While
            cnn1.Close()

            Return BatchList
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
        End Try
    End Function

    Public Sub PrintRptRegisteration(ByVal Term As String)
        If Term = "الفصل الدراسي الأول" Then
            Try
                Dim strGetcont As String
                strGetcont = " Select * From Students Registeration where FormNo=(Select Max(FormNo) From Students)"

                Dim dap As New SqlDataAdapter(strGetcont, cnn)
                Dim das As New DataSet

                cnn.Open()
                dap.Fill(das, "Registeration")
                cnn.Close()

                Dim rpt As New Rpt1stRegisteration

                rpt.SetDataSource(das)
                RptViewer.CrystalReportViewer1.ReportSource = rpt
                RptViewer.CrystalReportViewer1.RefreshReport()
                RptViewer.CrystalReportViewer1.Zoom(60)
                RptViewer.ShowDialog()
            Catch ex As Exception
                If cnn.State = ConnectionState.Open Then
                    cnn.Close()
                End If
            End Try
        Else
            Try

                Dim strGetcont As String
                strGetcont = " Select * From Students Registeration where FormNo=(Select Max(FormNo) From Students)"

                Dim dap As New SqlDataAdapter(strGetcont, cnn)
                Dim das As New DataSet

                cnn.Open()
                dap.Fill(das, "Registeration")
                cnn.Close()

                Dim rpt As New Rpt2ndRegisteration

                rpt.SetDataSource(das)
                RptViewer.CrystalReportViewer1.ReportSource = rpt
                RptViewer.CrystalReportViewer1.RefreshReport()
                RptViewer.CrystalReportViewer1.Zoom(60)
                RptViewer.ShowDialog()
            Catch ex As Exception
                If cnn.State = ConnectionState.Open Then
                    cnn.Close()
                End If
            End Try

        End If
    End Sub
End Module
