Imports System.Data.SqlClient

Public Class frmStudentsVacants

    
    Sub FillBatches()
        Try
            Me.CombBatch.Items.Clear()
            Dim BatchList As New ArrayList
            BatchList = GetBatchesList()

            For Each BatchName As String In BatchList
                Me.CombBatch.Items.Add(BatchName)
            Next
        Catch ex As Exception
            MsgBox(ex.ToString)
        End Try
    End Sub
    Sub FillAcdYear()
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.CombAcdYear.Items.Clear()
            Dim cmd As New SqlCommand("select Distinct AcdYear From Transactions Where Descr=N'تسجيل للعام الدراسي'", cnn)
            Dim rdr As SqlDataReader

            cnn.Open()
            rdr = cmd.ExecuteReader
            While rdr.Read
                Me.CombAcdYear.Items.Add(rdr.Item(0))
            End While
            cnn.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub

    Sub FillVacantsList()
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.ListView1.Items.Clear()
            Dim cmd As New SqlCommand("Select SNo,College,IsNull(Batch,'') Batch,Amount From StudentsVacants", cnn)
            Dim Reader As SqlDataReader

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                With Me.ListView1.Items.Add(Reader.Item(0))
                    .SubItems.Add(Reader.Item(1))
                    .SubItems.Add(Reader.Item(2))
                    .subitems.Add(Reader.Item(3))
                End With
            End While
            cnn.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub frmStudentsVacants_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Try
            Dim CollegeList As New ArrayList
            CollegeList = GetCollegesList()

            For Each CollegeName As String In CollegeList
                Me.CombColleges.Items.Add(CollegeName)
            Next
            FillAcdYear()

        Catch ex As Exception
            MsgBox(ex.ToString)
        End Try

        FillVacantsList()
        FillBatches()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        If Me.CombColleges.SelectedIndex = -1 OrElse Me.CombBatch.SelectedIndex = -1 OrElse Me.txtAmount.Text.Trim.Length = 0 Then
            MsgBox("الرجاء إكمال البيانات")
            Exit Sub
        Else
            Try
                Me.Cursor = Cursors.WaitCursor
                Dim cmdDel As New SqlCommand("Delete From StudentsVacants Where College=N'" & _
                                             Me.CombColleges.SelectedItem & "'", cnn)

                Dim cmd As New SqlCommand("Insert Into StudentsVacants (College,Batch,Amount) Values (N'" & Me.CombColleges.SelectedItem & _
                                          "',N'" & Me.CombBatch.SelectedItem & "'," & Me.txtAmount.Text.Trim & ")", cnn)

                cnn.Open()
                cmdDel.ExecuteNonQuery()
                cmd.ExecuteNonQuery()
                cnn.Close()

                Me.CombColleges.SelectedIndex = -1
                Me.txtAmount.Clear()
                Me.CombBatch.SelectedIndex = -1

                FillVacantsList()
                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                If cnn.State = ConnectionState.Open Then
                    cnn.Close()
                End If
                MsgBox(ex.Message)
            End Try
        End If
    End Sub

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        Me.Close()
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        Try
            If Me.CombAcdYear.SelectedIndex = -1 Then
                MsgBox("الرجاء تحديد العام الدراسي")
                Exit Sub
            End If
            If Me.DateTimePicker1.Value > Me.DateTimePicker2.Value Then
                MsgBox("الرجاء مراجعة التاريخ")
                Exit Sub
            End If

            


            Me.Cursor = Cursors.WaitCursor
            'view to get the total of registered students upto the max date
            Dim cmd1 As New SqlCommand("ALTER VIEW [dbo].[viewCollegRegTotal]" & _
                                    " AS SELECT     College, COUNT(DISTINCT StudID) AS Total" & _
                                    " FROM Transactions " & _
                                    " WHERE    Transtype = N'سند قبض'  AND(College IS NOT NULL) AND (AcdYear = N'" & Me.CombAcdYear.SelectedItem & "')" & _
                                    " and (TransDate < '" & Me.DateTimePicker2.Value.ToString("MM/dd/yyyy") & " 23:59:59')   " & _
                                    " AND  (TuitionFees + RegFees + OtherFees + Stam + MadicalInsh + MedExamFees + Clus + HiEdu + Univar <> 0)  GROUP BY College", cnn)


            'view to get the registered students in selected period
            Dim cmd2 As New SqlCommand("ALTER VIEW  viewCollegeRegSubTotal" & _
                                        " AS SELECT     College, COUNT(DISTINCT StudID) AS subTotal,descr,AcdYear " & _
                                        " FROM         dbo.Transactions" & _
                                        " WHERE    Transtype = N'سند قبض'  AND (TransDate BETWEEN '" & Me.DateTimePicker1.Value.ToString("MM/dd/yyyy") & _
                                        " 00:00:01' AND '" & Me.DateTimePicker2.Value.ToString("MM/dd/yyyy") & " 23:59:59') AND " & _
                                        " (College IS NOT NULL) and AcdYear=N'" & Me.CombAcdYear.SelectedItem & "' AND (StudID NOT IN" & _
                                        " (SELECT     StudID" & _
                                        " FROM         dbo.Transactions AS Transactions_1" & _
                                        " WHERE     Transtype = N'سند قبض' and (TransDate < '" & Me.DateTimePicker1.Value.ToString("MM/dd/yyyy") & _
                                        " 00:00:01') and AcdYear=N'" & Me.CombAcdYear.SelectedItem & "' ))  " & _
                                    " AND  (TuitionFees + RegFees + OtherFees + Stam + MadicalInsh + MedExamFees + Clus + HiEdu + Univar <> 0) GROUP BY College, Descr, AcdYear", cnn)

            cnn.Open()
            cmd1.ExecuteNonQuery()
            cmd2.ExecuteNonQuery()
            cnn.Close()



            Dim dap As New SqlDataAdapter("Select amount,total,college,SubTotal,'" & Me.DateTimePicker1.Value.ToString("MM/dd/yyyy") & "' as Descr,'" & Me.DateTimePicker2.Value.ToString("MM/dd/yyyy") & "' as AcdYear from ViewStudVacants", cnn)
            Dim das As New DataSet

            dap.Fill(das, "ViewStudVacants")

            Dim rpt As New CollegesRegAmount
            rpt.SetDataSource(das)
            RptViewer.CrystalReportViewer1.ReportSource = rpt
            RptViewer.CrystalReportViewer1.RefreshReport()
            RptViewer.CrystalReportViewer1.Zoom(60)
            RptViewer.ShowDialog()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

End Class